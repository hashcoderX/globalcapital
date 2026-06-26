'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getApiBaseUrl } from '@/lib/api';
import { WidgetCloseGate } from '@/lib/useWidgetsFixed';
import {
  ArrowLeft,
  Check,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  X,
} from 'lucide-react';

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-black shadow-sm transition focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400';

function extractApiMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const data = error.response?.data;
  if (typeof data === 'string') {
    return sanitizeMessage(data, fallback);
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (typeof record.message === 'string') {
      return sanitizeMessage(record.message, fallback);
    }
    if (typeof record.error === 'string') {
      return sanitizeMessage(record.error, fallback);
    }
    if (record.errors && typeof record.errors === 'object') {
      const first = Object.values(record.errors as Record<string, unknown>)[0];
      if (Array.isArray(first) && typeof first[0] === 'string') {
        return sanitizeMessage(first[0], fallback);
      }
    }
  }

  return fallback;
}

function sanitizeMessage(raw: string, fallback: string): string {
  const message = raw.trim();
  if (!message) return fallback;

  const lower = message.toLowerCase();
  if (
    lower.includes('sqlstate') ||
    lower.includes('integrity constraint violation') ||
    lower.includes('foreign key constraint') ||
    lower.includes('duplicate entry') ||
    lower.includes('connection: mysql') ||
    lower.includes('insert into')
  ) {
    return fallback;
  }

  return message;
}

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
  const apiBase = getApiBaseUrl();
  const widgetPrefix = 'hrm_roles_widget_';

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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [roleSearchTerm, setRoleSearchTerm] = useState('');
  const [rolesPage, setRolesPage] = useState(1);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('Notice');
  const [noticeMessage, setNoticeMessage] = useState('');

  const [permissionTemplates, setPermissionTemplates] = useState<PermissionTemplate[]>([]);
  const [existingPermissions, setExistingPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteRole, setPendingDeleteRole] = useState<Role | null>(null);
  const [hiddenWidgetKeys, setHiddenWidgetKeys] = useState<string[]>([]);
  const [widgetNotice, setWidgetNotice] = useState<string | null>(null);

  const fetchWidgetPreferences = useCallback(
    async (authToken?: string) => {
      const auth = authToken || token;
      if (!auth) return;

      try {
        const response = await axios.get(`${apiBase}/dashboard/widgets`, {
          headers: {
            Authorization: `Bearer ${auth}`,
            Accept: 'application/json',
          },
        });

        const widgets = Array.isArray(response.data?.widgets) ? response.data.widgets : [];
        const hiddenKeys = widgets
          .filter((item: { widget_key?: string; is_visible?: boolean | number | null }) => !item?.is_visible)
          .map((item: { widget_key?: string }) => item.widget_key)
          .filter((key: unknown): key is string => typeof key === 'string' && key.startsWith(widgetPrefix));

        setHiddenWidgetKeys(hiddenKeys);
        setWidgetNotice(null);
      } catch {
        setWidgetNotice('Failed to load widget preferences.');
      }
    },
    [apiBase, token, widgetPrefix]
  );

  const saveWidgetPreference = useCallback(
    async (widgetKey: string, isVisible: boolean) => {
      if (!token) return false;

      const normalizedKey = widgetKey.trim();
      if (!normalizedKey || normalizedKey.length > 120) {
        setWidgetNotice('Invalid widget key. Please refresh the page and try again.');
        return false;
      }

      try {
        await axios.patch(
          `${apiBase}/dashboard/widgets`,
          {
            widget_key: normalizedKey,
            is_visible: Boolean(isVisible),
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }
        );
        setWidgetNotice(null);
        return true;
      } catch {
        setWidgetNotice('Failed to save widget preference.');
        return false;
      }
    },
    [apiBase, token]
  );

  const hideWidget = useCallback(
    async (widgetKey: string) => {
      const ok = await saveWidgetPreference(widgetKey, false);
      if (!ok) return;

      setHiddenWidgetKeys((prev) => (prev.includes(widgetKey) ? prev : [...prev, widgetKey]));
    },
    [saveWidgetPreference]
  );

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
      fetchWidgetPreferences(authToken),
    ]);
  };

  const fetchRoles = async (authToken?: string): Promise<Role[]> => {
    const auth = authToken || token;
    if (!auth) return [];

    try {
      setRolesLoading(true);
      const response = await axios.get(`${apiBase}/roles`, {
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
      const response = await axios.get(`${apiBase}/permissions/template-file`, {
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
      const response = await axios.get(`${apiBase}/permissions`, {
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

  const allFilteredKeys = useMemo(
    () => groupedPermissions.flatMap((group) => group.items.map((item) => item.key)),
    [groupedPermissions]
  );

  const allFilteredSelected = useMemo(
    () => allFilteredKeys.length > 0 && allFilteredKeys.every((key) => selectedPermissionKeys.includes(key)),
    [allFilteredKeys, selectedPermissionKeys]
  );

  const filteredRoles = useMemo(() => {
    const keyword = roleSearchTerm.trim().toLowerCase();
    if (!keyword) return roles;

    return roles.filter((role) => {
      const text = `${role.name} ${role.description || ''} ${role.is_active ? 'active' : 'inactive'}`.toLowerCase();
      return text.includes(keyword);
    });
  }, [roles, roleSearchTerm]);

  const rolesPageSize = 10;
  const rolesTotalPages = Math.max(1, Math.ceil(filteredRoles.length / rolesPageSize));
  const rolesStartIndex = (rolesPage - 1) * rolesPageSize;
  const rolesEndIndex = Math.min(rolesStartIndex + rolesPageSize, filteredRoles.length);
  const paginatedRoles = filteredRoles.slice(rolesStartIndex, rolesStartIndex + rolesPageSize);

  const activeRolesCount = useMemo(
    () => roles.filter((role) => role.is_active).length,
    [roles]
  );
  const showRoleColumn = !hiddenWidgetKeys.includes(`${widgetPrefix}col_role`);
  const showDescriptionColumn = !hiddenWidgetKeys.includes(`${widgetPrefix}col_description`);
  const showStatusColumn = !hiddenWidgetKeys.includes(`${widgetPrefix}col_status`);
  const showActionsColumn = !hiddenWidgetKeys.includes(`${widgetPrefix}col_actions`);
  const showAnyRoleTableColumn =
    showRoleColumn || showDescriptionColumn || showStatusColumn || showActionsColumn;

  useEffect(() => {
    if (rolesPage > rolesTotalPages) {
      setRolesPage(rolesTotalPages);
    }
  }, [rolesPage, rolesTotalPages]);

  useEffect(() => {
    setRolesPage(1);
  }, [roleSearchTerm]);

  const openNotice = (title: string, message: string) => {
    setNoticeTitle(title);
    setNoticeMessage(message);
    setNoticeOpen(true);
  };

  const closeNotice = () => {
    setNoticeOpen(false);
    setNoticeTitle('Notice');
    setNoticeMessage('');
  };

  const openCreateForm = () => {
    resetForm();
    setFormError('');
    setFormSuccess('');
    setShowCreateForm(true);
  };

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
          `${apiBase}/permissions`,
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
        `${apiBase}/roles`,
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
      setShowCreateForm(false);
      await fetchExistingPermissions();
      await fetchRoles();
      openNotice('Success', 'Role created successfully with selected permissions.');
    } catch (error: unknown) {
      setFormError(
        extractApiMessage(error, 'Failed to create role. Please verify inputs and permissions.')
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
      await axios.delete(`${apiBase}/roles/${role.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchRoles();
      setFormSuccess(`Role "${role.name}" deleted successfully.`);
      closeConfirm();
      openNotice('Success', `Role "${role.name}" deleted successfully.`);
      return;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        try {
          await axios.post(
            `${apiBase}/roles/${role.id}`,
            { _method: 'DELETE' },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          await fetchRoles();
          closeConfirm();
          openNotice('Success', `Role "${role.name}" deleted successfully.`);
          return;
        } catch (fallbackError: unknown) {
          openNotice('Delete failed', extractApiMessage(fallbackError, 'Failed to delete role.'));
          return;
        }
      }

      openNotice('Delete failed', extractApiMessage(error, 'Failed to delete role.'));
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl" />
        <div className="absolute top-40 right-20 w-72 h-72 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl" />
      </div>

      {!hiddenWidgetKeys.includes(`${widgetPrefix}top_nav`) && (
        <nav className="relative z-10 bg-white/85 backdrop-blur-lg shadow-lg border-b border-white/20">
          <WidgetCloseGate>
            <button
              type="button"
              onClick={() => hideWidget(`${widgetPrefix}top_nav`)}
              className="absolute top-3 right-3 h-8 w-8 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-rose-600 hover:border-rose-300 shadow-sm z-20"
              aria-label="Hide top navigation widget"
              title="Hide widget"
            >
              ×
            </button>
          </WidgetCloseGate>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {!hiddenWidgetKeys.includes(`${widgetPrefix}back_button`) && (
              <div className="relative w-fit">
                <WidgetCloseGate>
                  <button
                    type="button"
                    onClick={() => hideWidget(`${widgetPrefix}back_button`)}
                    className="absolute -right-9 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-rose-600 hover:border-rose-300 shadow-sm"
                    aria-label="Hide back to HRM button widget"
                    title="Hide widget"
                  >
                    ×
                  </button>
                </WidgetCloseGate>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/hrm')}
                  className="inline-flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors text-sm font-medium"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to HRM
                </button>
              </div>
            )}
            {!hiddenWidgetKeys.includes(`${widgetPrefix}title`) && (
              <div className="inline-flex items-center gap-2 text-gray-900 font-semibold relative">
                <WidgetCloseGate>
                  <button
                    type="button"
                    onClick={() => hideWidget(`${widgetPrefix}title`)}
                    className="absolute -right-9 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-rose-600 hover:border-rose-300 shadow-sm"
                    aria-label="Hide role management title widget"
                    title="Hide widget"
                  >
                    ×
                  </button>
                </WidgetCloseGate>
                <Shield className="h-5 w-5 text-blue-600" />
                Role Management
              </div>
            )}
          </div>
        </nav>
      )}

      <main className="relative z-10 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        {widgetNotice && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {widgetNotice}
          </div>
        )}

        {!hiddenWidgetKeys.includes(`${widgetPrefix}hero`) && (
        <div className="rounded-3xl border border-white/80 bg-white/90 shadow-xl overflow-hidden relative">
          <WidgetCloseGate>
            <button
              type="button"
              onClick={() => hideWidget(`${widgetPrefix}hero`)}
              className="absolute top-3 right-3 z-20 h-8 w-8 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-rose-600 hover:border-rose-300 shadow-sm"
              aria-label="Hide roles hero widget"
              title="Hide widget"
            >
              ×
            </button>
          </WidgetCloseGate>
          <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 px-6 py-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-100">Human resources</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Roles & permissions</h1>
              <p className="text-sm text-blue-50 mt-1">
                Create roles and assign permissions loaded from the system permission file.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {!hiddenWidgetKeys.includes(`${widgetPrefix}hero_stat_roles`) && (
                <div className="rounded-2xl bg-white/15 px-4 py-3 text-center min-w-[88px] relative">
                  <WidgetCloseGate>
                    <button
                      type="button"
                      onClick={() => hideWidget(`${widgetPrefix}hero_stat_roles`)}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full border border-white/60 bg-white text-gray-500 hover:text-rose-600 hover:border-rose-300"
                      aria-label="Hide roles count widget"
                      title="Hide widget"
                    >
                      ×
                    </button>
                  </WidgetCloseGate>
                  <p className="text-2xl font-extrabold text-white">{roles.length}</p>
                  <p className="text-[10px] uppercase tracking-wide text-blue-100">Roles</p>
                </div>
              )}
              {!hiddenWidgetKeys.includes(`${widgetPrefix}hero_stat_active`) && (
                <div className="rounded-2xl bg-white/15 px-4 py-3 text-center min-w-[88px] relative">
                  <WidgetCloseGate>
                    <button
                      type="button"
                      onClick={() => hideWidget(`${widgetPrefix}hero_stat_active`)}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full border border-white/60 bg-white text-gray-500 hover:text-rose-600 hover:border-rose-300"
                      aria-label="Hide active roles widget"
                      title="Hide widget"
                    >
                      ×
                    </button>
                  </WidgetCloseGate>
                  <p className="text-2xl font-extrabold text-white">{activeRolesCount}</p>
                  <p className="text-[10px] uppercase tracking-wide text-blue-100">Active</p>
                </div>
              )}
              {!hiddenWidgetKeys.includes(`${widgetPrefix}hero_reload_permissions`) && (
                <div className="relative">
                  <WidgetCloseGate>
                    <button
                      type="button"
                      onClick={() => hideWidget(`${widgetPrefix}hero_reload_permissions`)}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full border border-white/60 bg-white text-gray-500 hover:text-rose-600 hover:border-rose-300"
                      aria-label="Hide reload permissions button widget"
                      title="Hide widget"
                    >
                      ×
                    </button>
                  </WidgetCloseGate>
                  <button
                    type="button"
                    onClick={() => fetchPermissionTemplates()}
                    disabled={syncingFile}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${syncingFile ? 'animate-spin' : ''}`} />
                    Reload permissions
                  </button>
                </div>
              )}
              {!hiddenWidgetKeys.includes(`${widgetPrefix}hero_add_role`) && (
                <div className="relative">
                  <WidgetCloseGate>
                    <button
                      type="button"
                      onClick={() => hideWidget(`${widgetPrefix}hero_add_role`)}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full border border-white/60 bg-white text-gray-500 hover:text-rose-600 hover:border-rose-300"
                      aria-label="Hide add role button widget"
                      title="Hide widget"
                    >
                      ×
                    </button>
                  </WidgetCloseGate>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-50 transition"
                  >
                    <Plus className="h-4 w-4" />
                    Add role
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {formError && (
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <span>{formError}</span>
            <button type="button" onClick={() => setFormError('')} className="text-rose-500 hover:text-rose-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {formSuccess && (
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span className="inline-flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" />
              {formSuccess}
            </span>
            <button type="button" onClick={() => setFormSuccess('')} className="text-emerald-600 hover:text-emerald-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-white">Add new role</h3>
                    <p className="text-white/85 text-sm mt-1">
                      Permissions from backend/public/permission_file.txt · {selectedPermissionKeys.length} selected
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="w-10 h-10 bg-white/20 rounded-xl text-white hover:bg-white/30"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateRole} className="flex flex-col flex-1 min-h-0">
                <div className="p-6 overflow-y-auto space-y-5 flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Role name *</label>
                      <input
                        type="text"
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-800">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(e) => setIsActive(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Active role
                      </label>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                      <textarea
                        value={roleDescription}
                        onChange={(e) => setRoleDescription(e.target.value)}
                        rows={2}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <label className="text-sm font-semibold text-gray-700">Permissions</label>
                      <button
                        type="button"
                        onClick={toggleAllFiltered}
                        className="px-3 py-1.5 text-xs rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold"
                      >
                        {allFilteredSelected ? 'Clear visible' : 'Select visible'}
                      </button>
                    </div>

                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={permissionSearch}
                        onChange={(e) => setPermissionSearch(e.target.value)}
                        placeholder="Search action, route, or section…"
                        className={`${inputClass} pl-10`}
                      />
                    </div>

                    <div className="max-h-[22rem] overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-3">
                      {groupedPermissions.map((group) => {
                        const groupKeys = group.items.map((item) => item.key);
                        const groupAllSelected =
                          groupKeys.length > 0 && groupKeys.every((key) => selectedPermissionKeys.includes(key));

                        return (
                          <div key={group.groupKey} className="rounded-xl border border-gray-200 bg-white p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {group.module} / {group.section}
                                </p>
                                <p className="text-xs text-gray-500">{group.items.length} permission(s)</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleGroup(groupKeys)}
                                className="px-2.5 py-1 text-xs rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold"
                              >
                                {groupAllSelected ? 'Clear' : 'Select all'}
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {group.items.map((item) => (
                                <label
                                  key={item.key}
                                  className="flex items-start gap-3 rounded-lg p-2 hover:bg-blue-50/50 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedPermissionKeys.includes(item.key)}
                                    onChange={() => togglePermission(item.key)}
                                    className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900">{item.action}</p>
                                    <p className="text-xs text-gray-600 truncate">{item.route || item.description}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {groupedPermissions.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-6">No permissions loaded. Reload the permission file.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-gray-100 shrink-0 bg-white">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setShowCreateForm(false);
                    }}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold disabled:opacity-60"
                  >
                    {loading ? 'Creating…' : 'Create role'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {!hiddenWidgetKeys.includes(`${widgetPrefix}roles_table_section`) && (
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden relative">
          <WidgetCloseGate>
            <button
              type="button"
              onClick={() => hideWidget(`${widgetPrefix}roles_table_section`)}
              className="absolute top-3 right-3 z-20 h-8 w-8 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-rose-600 hover:border-rose-300 shadow-sm"
              aria-label="Hide role list widget"
              title="Hide widget"
            >
              ×
            </button>
          </WidgetCloseGate>
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Role list</h2>
            <div className="flex flex-wrap items-center gap-2">
              {!hiddenWidgetKeys.includes(`${widgetPrefix}roles_search`) && (
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={roleSearchTerm}
                    onChange={(e) => setRoleSearchTerm(e.target.value)}
                    placeholder="Search roles…"
                    className={`${inputClass} pl-10 py-2.5`}
                  />
                  <WidgetCloseGate>
                    <button
                      type="button"
                      onClick={() => hideWidget(`${widgetPrefix}roles_search`)}
                      className="absolute -right-9 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-rose-600 hover:border-rose-300 shadow-sm"
                      aria-label="Hide role search widget"
                      title="Hide widget"
                    >
                      ×
                    </button>
                  </WidgetCloseGate>
                </div>
              )}
              {!hiddenWidgetKeys.includes(`${widgetPrefix}roles_refresh`) && (
                <div className="relative">
                  <WidgetCloseGate>
                    <button
                      type="button"
                      onClick={() => hideWidget(`${widgetPrefix}roles_refresh`)}
                      className="absolute -right-8 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-rose-600 hover:border-rose-300 shadow-sm"
                      aria-label="Hide role refresh button widget"
                      title="Hide widget"
                    >
                      ×
                    </button>
                  </WidgetCloseGate>
                  <button
                    type="button"
                    onClick={() => fetchRoles()}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>
              )}
            </div>
          </div>

          {rolesLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-blue-50" />
              ))}
            </div>
          ) : (
            <>
              {showAnyRoleTableColumn ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {showRoleColumn && (
                        <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          <div className="flex items-center gap-2">
                            <span>Role</span>
                            <WidgetCloseGate>
                              <button
                                type="button"
                                onClick={() => hideWidget(`${widgetPrefix}col_role`)}
                                className="h-6 w-6 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-rose-600 hover:border-rose-300"
                                aria-label="Hide role column"
                                title="Hide column"
                              >
                                ×
                              </button>
                            </WidgetCloseGate>
                          </div>
                        </th>
                      )}
                      {showDescriptionColumn && (
                        <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          <div className="flex items-center gap-2">
                            <span>Description</span>
                            <WidgetCloseGate>
                              <button
                                type="button"
                                onClick={() => hideWidget(`${widgetPrefix}col_description`)}
                                className="h-6 w-6 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-rose-600 hover:border-rose-300"
                                aria-label="Hide description column"
                                title="Hide column"
                              >
                                ×
                              </button>
                            </WidgetCloseGate>
                          </div>
                        </th>
                      )}
                      {showStatusColumn && (
                        <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          <div className="flex items-center gap-2">
                            <span>Status</span>
                            <WidgetCloseGate>
                              <button
                                type="button"
                                onClick={() => hideWidget(`${widgetPrefix}col_status`)}
                                className="h-6 w-6 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-rose-600 hover:border-rose-300"
                                aria-label="Hide status column"
                                title="Hide column"
                              >
                                ×
                              </button>
                            </WidgetCloseGate>
                          </div>
                        </th>
                      )}
                      {showActionsColumn && (
                        <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          <div className="flex items-center gap-2">
                            <span>Actions</span>
                            <WidgetCloseGate>
                              <button
                                type="button"
                                onClick={() => hideWidget(`${widgetPrefix}col_actions`)}
                                className="h-6 w-6 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-rose-600 hover:border-rose-300"
                                aria-label="Hide actions column"
                                title="Hide column"
                              >
                                ×
                              </button>
                            </WidgetCloseGate>
                          </div>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedRoles.length === 0 ? (
                      <tr>
                        <td
                          colSpan={
                            (showRoleColumn ? 1 : 0) +
                            (showDescriptionColumn ? 1 : 0) +
                            (showStatusColumn ? 1 : 0) +
                            (showActionsColumn ? 1 : 0) || 1
                          }
                          className="px-6 py-12 text-center text-sm text-gray-500"
                        >
                          {roleSearchTerm ? 'No roles match your search.' : 'No roles yet. Click Add role to create one.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedRoles.map((role) => (
                        <tr key={role.id} className="hover:bg-blue-50/40 transition-colors">
                          {showRoleColumn && (
                            <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">{role.name}</td>
                          )}
                          {showDescriptionColumn && (
                            <td className="px-6 py-4 text-gray-800">{role.description || '—'}</td>
                          )}
                          {showStatusColumn && (
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                  role.is_active
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {role.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          )}
                          {showActionsColumn && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleDeleteRole(role)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 transition hover:border-rose-300 hover:bg-rose-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              ) : (
                <div className="px-6 py-12 text-center text-sm text-gray-500">
                  All role table columns are hidden. Use `Restore Hidden Widgets` in the main dashboard.
                </div>
              )}

              <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-gray-600">
                  Showing {filteredRoles.length === 0 ? 0 : rolesStartIndex + 1} to {rolesEndIndex} of {filteredRoles.length}
                  {filteredRoles.length !== roles.length ? ` (filtered from ${roles.length})` : ''}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRolesPage((prev) => Math.max(1, prev - 1))}
                    disabled={rolesPage === 1}
                    className="px-3 py-1.5 rounded-md border border-gray-300 text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {rolesPage} of {rolesTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRolesPage((prev) => Math.min(rolesTotalPages, prev + 1))}
                    disabled={rolesPage === rolesTotalPages}
                    className="px-3 py-1.5 rounded-md border border-gray-300 text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        )}
      </main>

      {confirmOpen && pendingDeleteRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeConfirm} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900">Confirm delete</h3>
            <p className="mt-2 text-sm text-gray-700">
              Are you sure you want to delete role &quot;{pendingDeleteRole.name}&quot;?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirm}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteRole}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {noticeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/30" onClick={closeNotice} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900">{noticeTitle}</h3>
            <p className="mt-2 text-sm text-gray-700 leading-relaxed">{noticeMessage}</p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={closeNotice}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
