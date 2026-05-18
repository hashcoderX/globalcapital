'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface Permission {
  id: number;
  name: string;
  module: string;
  description: string;
  is_active: boolean;
}

interface Role {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  permissions?: Permission[];
  created_at?: string;
}

interface PermissionTemplate {
  key: string;
  name: string;
  module: string;
  section: string;
  action: string;
  route: string;
  description: string;
}

const slugify = (value: string): string =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const parsePermissionFile = (content: string): PermissionTemplate[] => {
  const lines = content.split(/\r?\n/);
  let currentModule = 'General';
  let currentSection = 'General';

  const templates: PermissionTemplate[] = [];
  const seen = new Set<string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^\d+\./.test(line)) {
      currentModule = line.replace(/^\d+\./, '').trim() || 'General';
      currentSection = 'General';
      continue;
    }

    const leadingSpaces = (rawLine.match(/^\s*/) || [''])[0].length;

    if (leadingSpaces <= 2 && !line.includes(' - ')) {
      currentSection = line;
      continue;
    }

    const parts = line.split(' - ').map((part) => part.trim()).filter(Boolean);
    if (parts.length === 0) continue;

    const action = parts[0];
    const routePart = parts.find((part) => part.startsWith('/dashboard')) || '';
    const extraDetails = parts.filter((part) => part !== action && part !== routePart).join(' - ');

    const permissionName = [slugify(currentModule), slugify(currentSection), slugify(action)]
      .filter(Boolean)
      .join('_');

    if (!permissionName || seen.has(permissionName)) continue;
    seen.add(permissionName);

    const descriptionParts = [action, routePart ? `Route: ${routePart}` : '', extraDetails];

    templates.push({
      key: permissionName,
      name: permissionName,
      module: currentModule,
      section: currentSection,
      action,
      route: routePart,
      description: descriptionParts.filter(Boolean).join(' | '),
    });
  }

  return templates;
};

const ensureMicrofinanceSummaryTemplates = (
  templates: PermissionTemplate[]
): PermissionTemplate[] => {
  const requiredActions = [
    'Summary Report Total Outstanding Amount',
    'Summary Report Today Collection',
    'Summary Report Asset Value Total',
    'Summary Report Month Collection',
    'Summary Report Imagine Profit',
    'Summary Report Today Profit',
    'Summary Report Month Profit',
  ];

  const byName = new Set(templates.map((item) => String(item.name || '').trim().toLowerCase()));
  const merged = [...templates];

  for (const action of requiredActions) {
    const key = [slugify('Credit'), slugify('Summary Report Workspace'), slugify(action)]
      .filter(Boolean)
      .join('_');

    if (byName.has(key.toLowerCase())) {
      continue;
    }

    merged.push({
      key,
      name: key,
      module: 'Credit',
      section: 'Summary Report Workspace',
      action,
      route: '/dashboard/microfinance',
      description: `${action} | Route: /dashboard/microfinance`,
    });

    byName.add(key.toLowerCase());
  }

  return merged;
};

export default function RolesAddPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncingFile, setSyncingFile] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<string[]>([]);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [permissionTemplates, setPermissionTemplates] = useState<PermissionTemplate[]>([]);
  const [existingPermissions, setExistingPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteRole, setPendingDeleteRole] = useState<Role | null>(null);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [editingPermissionsRole, setEditingPermissionsRole] = useState<Role | null>(null);
  const [editingPermissionKeys, setEditingPermissionKeys] = useState<string[]>([]);
  const [permissionsModalSearch, setPermissionsModalSearch] = useState('');
  const [savingPermissions, setSavingPermissions] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }

    setToken(storedToken);
    void initializePage(storedToken);
  }, [router]);

  const initializePage = async (authToken: string) => {
    await Promise.all([
      fetchPermissionTemplates(authToken),
      fetchExistingPermissions(authToken),
      fetchRoles(authToken),
    ]);
  };

  const fetchRoles = async (authToken?: string): Promise<Role[]> => {
    const auth = authToken || token;
    if (!auth) return [];

    try {
      setRolesLoading(true);
      const response = await axios.get(`${API_URL}/api/roles`, {
        headers: { Authorization: `Bearer ${auth}` },
        params: { per_page: 1000 },
      });

      const rows = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setRoles(rows as Role[]);
      return rows as Role[];
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      setRoles([]);
      return [];
    } finally {
      setRolesLoading(false);
    }
  };

  const fetchPermissionTemplates = async (authToken?: string) => {
    const auth = authToken || token;
    if (!auth) return;

    try {
      setSyncingFile(true);
      setFormError('');
      const response = await axios.get(`${API_URL}/api/permissions/template-file`, {
        headers: { Authorization: `Bearer ${auth}` },
      });

      const content = String(response?.data?.content || '');
      if (!content.trim()) {
        throw new Error('Permission template file is empty.');
      }

      const parsed = parsePermissionFile(content);
      const normalizedTemplates = ensureMicrofinanceSummaryTemplates(parsed);
      setPermissionTemplates(normalizedTemplates);
    } catch (error: any) {
      console.error('Failed to load permission file:', error);
      setFormError(
        error?.response?.data?.message ||
        error?.message ||
        'Failed to load permission definitions from backend permission file.'
      );
      setPermissionTemplates([]);
    } finally {
      setSyncingFile(false);
    }
  };

  const fetchExistingPermissions = async (authToken?: string): Promise<Permission[]> => {
    const auth = authToken || token;
    if (!auth) return [];

    try {
      const response = await axios.get(`${API_URL}/api/permissions`, {
        headers: { Authorization: `Bearer ${auth}` },
        params: { per_page: 2000 },
      });

      const rows = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setExistingPermissions(rows);
      return rows as Permission[];
    } catch (error) {
      console.error('Failed to fetch existing permissions:', error);
      setExistingPermissions([]);
      return [] as Permission[];
    }
  };

  const groupedPermissions = useMemo(() => {
    const keyword = permissionSearch.trim().toLowerCase();

    const filtered = keyword
      ? permissionTemplates.filter((item) => {
          const text = `${item.module} ${item.section} ${item.action} ${item.route} ${item.description}`.toLowerCase();
          return text.includes(keyword);
        })
      : permissionTemplates;

    const groupMap = new Map<string, PermissionTemplate[]>();

    filtered.forEach((item) => {
      const key = `${item.module}::${item.section}`;
      const bucket = groupMap.get(key) || [];
      bucket.push(item);
      groupMap.set(key, bucket);
    });

    return Array.from(groupMap.entries())
      .map(([groupKey, items]) => ({
        groupKey,
        module: items[0]?.module || 'General',
        section: items[0]?.section || 'General',
        items: [...items].sort((a, b) => a.action.localeCompare(b.action)),
      }))
      .sort((a, b) => `${a.module} ${a.section}`.localeCompare(`${b.module} ${b.section}`));
  }, [permissionTemplates, permissionSearch]);

  const groupedPermissionsForModal = useMemo(() => {
    const keyword = permissionsModalSearch.trim().toLowerCase();

    const filtered = keyword
      ? permissionTemplates.filter((item) => {
          const text = `${item.module} ${item.section} ${item.action} ${item.route} ${item.description}`.toLowerCase();
          return text.includes(keyword);
        })
      : permissionTemplates;

    const groupMap = new Map<string, PermissionTemplate[]>();

    filtered.forEach((item) => {
      const key = `${item.module}::${item.section}`;
      const bucket = groupMap.get(key) || [];
      bucket.push(item);
      groupMap.set(key, bucket);
    });

    return Array.from(groupMap.entries())
      .map(([groupKey, items]) => ({
        groupKey,
        module: items[0]?.module || 'General',
        section: items[0]?.section || 'General',
        items: [...items].sort((a, b) => a.action.localeCompare(b.action)),
      }))
      .sort((a, b) => `${a.module} ${a.section}`.localeCompare(`${b.module} ${b.section}`));
  }, [permissionTemplates, permissionsModalSearch]);

  const allFilteredKeys = useMemo(
    () => groupedPermissions.flatMap((group) => group.items.map((item) => item.key)),
    [groupedPermissions]
  );

  const allFilteredSelected = useMemo(
    () => allFilteredKeys.length > 0 && allFilteredKeys.every((key) => selectedPermissionKeys.includes(key)),
    [allFilteredKeys, selectedPermissionKeys]
  );

  const modalFilteredKeys = useMemo(
    () => groupedPermissionsForModal.flatMap((group) => group.items.map((item) => item.key)),
    [groupedPermissionsForModal]
  );

  const modalAllFilteredSelected = useMemo(
    () => modalFilteredKeys.length > 0 && modalFilteredKeys.every((key) => editingPermissionKeys.includes(key)),
    [modalFilteredKeys, editingPermissionKeys]
  );

  const togglePermission = (key: string) => {
    setSelectedPermissionKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const toggleGroup = (keys: string[]) => {
    if (keys.length === 0) return;

    setSelectedPermissionKeys((prev) => {
      const allSelected = keys.every((key) => prev.includes(key));
      if (allSelected) {
        return prev.filter((key) => !keys.includes(key));
      }
      return Array.from(new Set([...prev, ...keys]));
    });
  };

  const toggleAllFiltered = () => {
    if (allFilteredKeys.length === 0) return;

    setSelectedPermissionKeys((prev) => {
      if (allFilteredSelected) {
        return prev.filter((key) => !allFilteredKeys.includes(key));
      }
      return Array.from(new Set([...prev, ...allFilteredKeys]));
    });
  };

  const ensurePermissionIds = async (): Promise<number[]> => {
    return resolvePermissionIdsForKeys(selectedPermissionKeys);
  };

  const resolvePermissionIdsForKeys = async (keys: string[]): Promise<number[]> => {
    const selectedTemplates = permissionTemplates.filter((tpl) => keys.includes(tpl.key));
    if (selectedTemplates.length === 0) {
      return [];
    }

    const resolvedIds: number[] = [];
    const byName = new Map<string, Permission>(
      existingPermissions.map((perm) => [String(perm.name || '').toLowerCase(), perm])
    );

    for (const template of selectedTemplates) {
      const lookupKey = template.name.toLowerCase();
      const existing = byName.get(lookupKey);
      if (existing?.id) {
        resolvedIds.push(existing.id);
        continue;
      }

      try {
        const createRes = await axios.post(
          `${API_URL}/api/permissions`,
          {
            name: template.name,
            module: template.module,
            description: template.description,
            is_active: true,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const created = createRes.data;
        const createdId = Number(created?.id || 0);
        if (createdId > 0) {
          resolvedIds.push(createdId);
          byName.set(lookupKey, {
            id: createdId,
            name: String(created?.name || template.name),
            module: String(created?.module || template.module),
            description: String(created?.description || template.description),
            is_active: created?.is_active !== false,
          });
        }
      } catch (error: any) {
        if (error?.response?.status === 422) {
          const refreshed = (await fetchExistingPermissions()) || [];
          const latest = refreshed.find((perm) => String(perm.name || '').toLowerCase() === lookupKey);
          if (latest?.id) {
            resolvedIds.push(latest.id);
          }
          continue;
        }

        throw error;
      }
    }

    return Array.from(new Set(resolvedIds));
  };

  const openPermissionsModal = (role: Role) => {
    const assignedNames = new Set(
      (role.permissions || [])
        .map((permission) => String(permission.name || '').toLowerCase().trim())
        .filter(Boolean)
    );

    const matchedKeys = permissionTemplates
      .filter((tpl) => assignedNames.has(String(tpl.name || '').toLowerCase().trim()))
      .map((tpl) => tpl.key);

    setEditingPermissionsRole(role);
    setEditingPermissionKeys(matchedKeys);
    setPermissionsModalSearch('');
    setPermissionsModalOpen(true);
  };

  const closePermissionsModal = () => {
    setPermissionsModalOpen(false);
    setEditingPermissionsRole(null);
    setEditingPermissionKeys([]);
    setPermissionsModalSearch('');
  };

  const toggleModalPermission = (key: string) => {
    setEditingPermissionKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const toggleModalGroup = (keys: string[]) => {
    if (keys.length === 0) return;

    setEditingPermissionKeys((prev) => {
      const allSelected = keys.every((key) => prev.includes(key));
      if (allSelected) {
        return prev.filter((key) => !keys.includes(key));
      }
      return Array.from(new Set([...prev, ...keys]));
    });
  };

  const toggleAllModalFiltered = () => {
    if (modalFilteredKeys.length === 0) return;

    setEditingPermissionKeys((prev) => {
      if (modalAllFilteredSelected) {
        return prev.filter((key) => !modalFilteredKeys.includes(key));
      }
      return Array.from(new Set([...prev, ...modalFilteredKeys]));
    });
  };

  const saveRolePermissions = async () => {
    if (!editingPermissionsRole) return;

    setSavingPermissions(true);
    setFormError('');
    setFormSuccess('');

    try {
      const permissionIds = await resolvePermissionIdsForKeys(editingPermissionKeys);

      await axios.put(
        `${API_URL}/api/roles/${editingPermissionsRole.id}/permissions`,
        { permissions: permissionIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchRoles();
      setFormSuccess(`Permissions updated for role "${editingPermissionsRole.name}".`);
      closePermissionsModal();
    } catch (error: any) {
      setFormError(
        error?.response?.data?.message ||
        'Failed to update role permissions.'
      );
    } finally {
      setSavingPermissions(false);
    }
  };

  const resetForm = () => {
    setRoleName('');
    setRoleDescription('');
    setIsActive(true);
    setSelectedPermissionKeys([]);
    setPermissionSearch('');
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roleName.trim()) {
      setFormError('Role name is required.');
      return;
    }

    setLoading(true);
    setFormError('');
    setFormSuccess('');

    try {
      const permissionIds = await ensurePermissionIds();

      await axios.post(
        `${API_URL}/api/roles`,
        {
          name: roleName.trim(),
          description: roleDescription.trim(),
          permissions: permissionIds,
          is_active: isActive,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setFormSuccess('Role created successfully with selected permissions.');
      resetForm();
      await fetchExistingPermissions();
      await fetchRoles();
    } catch (error: any) {
      console.error('Error creating role:', error?.response?.status, error?.response?.data || error?.message);
      const validationErrors = error?.response?.data?.errors;
      const firstValidationError = validationErrors && typeof validationErrors === 'object'
        ? String(Object.values(validationErrors).flat()[0] || '')
        : '';

      setFormError(
        error?.response?.data?.message ||
        firstValidationError ||
        'Failed to create role. Please verify inputs and permissions.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    setPendingDeleteRole(role);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setPendingDeleteRole(null);
  };

  const confirmDeleteRole = async () => {
    const role = pendingDeleteRole;
    if (!role) return;

    setFormError('');
    setFormSuccess('');

    try {
      await axios.delete(`${API_URL}/api/roles/${role.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchRoles();
      setFormSuccess(`Role "${role.name}" deleted successfully.`);
      closeConfirm();
      return;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        try {
          await axios.post(
            `${API_URL}/api/roles/${role.id}`,
            { _method: 'DELETE' },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          await fetchRoles();
          setFormSuccess(`Role "${role.name}" deleted successfully.`);
          closeConfirm();
          return;
        } catch (fallbackError: any) {
          setFormError(
            fallbackError?.response?.data?.message ||
            'Failed to delete role. Please verify API routing and permissions.'
          );
          return;
        }
      }

      setFormError(error?.response?.data?.message || 'Failed to delete role.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => router.push('/dashboard/hrm')}
            className="text-sm font-medium text-black hover:text-black"
          >
            Back to HRM
          </button>
          <button
            type="button"
            onClick={() => fetchPermissionTemplates()}
            disabled={syncingFile}
            className="px-3 py-1.5 text-xs rounded-md border border-cyan-200 text-cyan-700 hover:bg-cyan-50 disabled:opacity-60"
          >
            {syncingFile ? 'Loading permission file...' : 'Reload permission file'}
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
          <h1 className="text-2xl font-bold text-black">Add New Role</h1>
          <p className="text-sm text-black mt-1">
            Permissions are loaded from backend/public/permission_file.txt
          </p>

          <form onSubmit={handleCreateRole} className="mt-6 space-y-5">
            {formError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {formError}
              </div>
            ) : null}

            {formSuccess ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {formSuccess}
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">Role Name *</label>
                <input
                  type="text"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-black placeholder:text-black focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-sm text-black">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  Active
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-black mb-2">Description</label>
                <textarea
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-black placeholder:text-black focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <label className="text-sm font-medium text-black">Permissions</label>
                <button
                  type="button"
                  onClick={toggleAllFiltered}
                  className="px-3 py-1.5 text-xs rounded-md border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  {allFilteredSelected ? 'Clear All Visible' : 'Select All Visible'}
                </button>
              </div>

              <input
                type="text"
                value={permissionSearch}
                onChange={(e) => setPermissionSearch(e.target.value)}
                placeholder="Search action, route, or section"
                className="w-full mb-3 rounded-xl border border-slate-300 px-3 py-2 text-sm text-black placeholder:text-black focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />

              <div className="max-h-[28rem] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                {groupedPermissions.map((group) => {
                  const groupKeys = group.items.map((item) => item.key);
                  const groupAllSelected = groupKeys.length > 0 && groupKeys.every((key) => selectedPermissionKeys.includes(key));

                  return (
                    <div key={group.groupKey} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold text-black">{group.module} / {group.section}</p>
                          <p className="text-xs text-black">{group.items.length} item(s)</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleGroup(groupKeys)}
                          className="px-2.5 py-1 text-xs rounded-md border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                          {groupAllSelected ? 'Clear' : 'Select All'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {group.items.map((item) => (
                          <label key={item.key} className="flex items-start gap-3 rounded-lg p-2 hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={selectedPermissionKeys.includes(item.key)}
                              onChange={() => togglePermission(item.key)}
                              className="mt-0.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-black">{item.action}</p>
                              <p className="text-xs text-black truncate">{item.route || item.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {groupedPermissions.length === 0 && (
                  <p className="text-sm text-black">No permissions loaded from permission_file.txt.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-black hover:bg-slate-100"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-60"
              >
                {loading ? 'Creating...' : 'Create Role'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-black">Created Roles</h2>
            <button
              type="button"
              onClick={() => fetchRoles()}
              className="px-3 py-1.5 text-xs rounded-md border border-slate-300 text-black hover:bg-slate-100"
            >
              Refresh
            </button>
          </div>

          {rolesLoading ? (
            <p className="text-sm text-black">Loading roles...</p>
          ) : roles.length === 0 ? (
            <p className="text-sm text-black">No roles found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-black">
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Description</th>
                    <th className="py-2 pr-4">Permissions</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role.id} className="border-b border-slate-100">
                      <td className="py-2 pr-4 font-medium text-black">{role.name}</td>
                      <td className="py-2 pr-4 text-black">{role.description || '-'}</td>
                      <td className="py-2 pr-4 text-black">{role.permissions?.length || 0}</td>
                      <td className="py-2 pr-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${role.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {role.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openPermissionsModal(role)}
                            className="px-2.5 py-1 text-xs rounded-md border border-cyan-300 text-cyan-700 hover:bg-cyan-50"
                          >
                            Edit Permissions
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(role)}
                            className="px-2.5 py-1 text-xs rounded-md border border-rose-300 text-rose-700 hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {confirmOpen && pendingDeleteRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeConfirm} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-semibold text-black">Confirm Delete</h3>
            <p className="mt-2 text-sm text-black">
              Are you sure you want to delete role "{pendingDeleteRole.name}"?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirm}
                className="px-4 py-2 rounded-lg border border-slate-300 text-black hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteRole}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {permissionsModalOpen && editingPermissionsRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={closePermissionsModal} />
          <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-200 p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-black">Edit Role Permissions</h3>
                <p className="text-sm text-black mt-1">Role: {editingPermissionsRole.name}</p>
              </div>
              <button
                type="button"
                onClick={closePermissionsModal}
                className="px-3 py-1.5 text-xs rounded-md border border-slate-300 text-black hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 mb-3">
              <label className="text-sm font-medium text-black">Permissions</label>
              <button
                type="button"
                onClick={toggleAllModalFiltered}
                className="px-3 py-1.5 text-xs rounded-md border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                {modalAllFilteredSelected ? 'Clear All Visible' : 'Select All Visible'}
              </button>
            </div>

            <input
              type="text"
              value={permissionsModalSearch}
              onChange={(e) => setPermissionsModalSearch(e.target.value)}
              placeholder="Search action, route, or section"
              className="w-full mb-3 rounded-xl border border-slate-300 px-3 py-2 text-sm text-black placeholder:text-black focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />

            <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
              {groupedPermissionsForModal.map((group) => {
                const groupKeys = group.items.map((item) => item.key);
                const groupAllSelected = groupKeys.length > 0 && groupKeys.every((key) => editingPermissionKeys.includes(key));

                return (
                  <div key={group.groupKey} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-black">{group.module} / {group.section}</p>
                        <p className="text-xs text-black">{group.items.length} item(s)</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleModalGroup(groupKeys)}
                        className="px-2.5 py-1 text-xs rounded-md border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      >
                        {groupAllSelected ? 'Clear' : 'Select All'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {group.items.map((item) => (
                        <label key={item.key} className="flex items-start gap-3 rounded-lg p-2 hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={editingPermissionKeys.includes(item.key)}
                            onChange={() => toggleModalPermission(item.key)}
                            className="mt-0.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-black">{item.action}</p>
                            <p className="text-xs text-black truncate">{item.route || item.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}

              {groupedPermissionsForModal.length === 0 && (
                <p className="text-sm text-black">No permissions loaded from permission_file.txt.</p>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closePermissionsModal}
                className="px-4 py-2 rounded-lg border border-slate-300 text-black hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveRolePermissions}
                disabled={savingPermissions}
                className="px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-60"
              >
                {savingPermissions ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
