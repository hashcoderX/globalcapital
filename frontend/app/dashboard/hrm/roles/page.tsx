'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: Permission[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Permission {
  id: number;
  name: string;
  module: string;
  description: string;
  is_active: boolean;
}

interface UserRole {
  id: number;
  user_id: number;
  role_id: number;
  assigned_at: string;
  assigned_by: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  role: Role;
}

interface Designation {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export default function Roles() {
  const [token, setToken] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const router = useRouter();

  // Form fields
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Assignment fields
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [selectedDesignationId, setSelectedDesignationId] = useState<string>('');

  // Actions menu state
  const [openMenuFor, setOpenMenuFor] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void> | void) | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenuFor && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuFor(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuFor(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [openMenuFor]);

  const openConfirm = (title: string, message: string, onConfirm: () => Promise<void> | void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmAction(onConfirm);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setConfirmTitle('');
    setConfirmMessage('');
    setConfirmAction(null);
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
    } else {
      setToken(storedToken);
      fetchRoles(storedToken);
      fetchPermissions(storedToken);
      fetchUsers(storedToken);
      fetchDesignations(storedToken);
    }
  }, [router]);

  const fetchRoles = async (authToken?: string) => {
    const tokenToUse = authToken || token;
    if (!tokenToUse) return;

    try {
      const response = await axios.get('http://localhost:8000/api/roles', {
        headers: { Authorization: `Bearer ${tokenToUse}` },
        params: { per_page: 1000 }
      });
      setRoles(response.data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      // For demo purposes, set some sample data
      setRoles([
        {
          id: 1,
          name: 'Super Admin',
          description: 'Full system access with all permissions',
          permissions: [],
          is_active: true,
          created_at: '2025-01-01T00:00:00.000000Z',
          updated_at: '2025-01-01T00:00:00.000000Z'
        },
        {
          id: 2,
          name: 'HR Manager',
          description: 'Manage HR operations and employee data',
          permissions: [],
          is_active: true,
          created_at: '2025-01-01T00:00:00.000000Z',
          updated_at: '2025-01-01T00:00:00.000000Z'
        },
        {
          id: 3,
          name: 'Employee',
          description: 'Basic employee access',
          permissions: [],
          is_active: true,
          created_at: '2025-01-01T00:00:00.000000Z',
          updated_at: '2025-01-01T00:00:00.000000Z'
        }
      ]);
    }
  };

  const fetchPermissions = async (authToken?: string) => {
    const tokenToUse = authToken || token;
    if (!tokenToUse) return;

    try {
      const response = await axios.get('http://localhost:8000/api/permissions', {
        headers: { Authorization: `Bearer ${tokenToUse}` },
        params: { per_page: 1000 }
      });
      setPermissions(response.data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      // For demo purposes, set some sample data
      setPermissions([
        { id: 1, name: 'view_employees', module: 'Employees', description: 'View employee records', is_active: true },
        { id: 2, name: 'create_employees', module: 'Employees', description: 'Create new employees', is_active: true },
        { id: 3, name: 'edit_employees', module: 'Employees', description: 'Edit employee records', is_active: true },
        { id: 4, name: 'delete_employees', module: 'Employees', description: 'Delete employees', is_active: true },
        { id: 5, name: 'view_departments', module: 'Departments', description: 'View departments', is_active: true },
        { id: 6, name: 'manage_departments', module: 'Departments', description: 'Manage departments', is_active: true },
        { id: 7, name: 'view_attendance', module: 'Attendance', description: 'View attendance records', is_active: true },
        { id: 8, name: 'manage_attendance', module: 'Attendance', description: 'Manage attendance', is_active: true },
        { id: 9, name: 'view_leaves', module: 'Leaves', description: 'View leave requests', is_active: true },
        { id: 10, name: 'manage_leaves', module: 'Leaves', description: 'Manage leave requests', is_active: true },
        { id: 11, name: 'view_payroll', module: 'Payroll', description: 'View payroll data', is_active: true },
        { id: 12, name: 'manage_payroll', module: 'Payroll', description: 'Manage payroll', is_active: true }
      ]);
    }
  };

  const fetchUsers = async (authToken?: string) => {
    const tokenToUse = authToken || token;
    if (!tokenToUse) return;

    try {
      const response = await axios.get('http://localhost:8000/api/hr/employees', {
        headers: { Authorization: `Bearer ${tokenToUse}` },
        params: { per_page: 1000 }
      });
      const employeesData = response.data.data || response.data;
      setUsers(Array.isArray(employeesData) ? employeesData : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchDesignations = async (authToken?: string) => {
    const tokenToUse = authToken || token;
    if (!tokenToUse) return;

    try {
      const response = await axios.get('http://localhost:8000/api/hr/designations', {
        headers: { Authorization: `Bearer ${tokenToUse}` },
        params: { per_page: 1000 }
      });
      const designationsData = response.data.data || response.data;
      setDesignations(Array.isArray(designationsData) ? designationsData : []);
    } catch (error) {
      console.error('Error fetching designations:', error);
    }
  };

  const resetForm = () => {
    setRoleName('');
    setRoleDescription('');
    setSelectedPermissions([]);
    setIsActive(true);
    setEditingRole(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const roleData = {
      name: roleName,
      description: roleDescription,
      permissions: selectedPermissions,
      is_active: isActive,
    };

    try {
      if (editingRole) {
        await axios.put(`http://localhost:8000/api/roles/${editingRole.id}`, roleData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post('http://localhost:8000/api/roles', roleData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      fetchRoles();
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error saving role:', error);
      // For demo purposes, simulate success
      const newRole: Role = {
        id: editingRole ? editingRole.id : Date.now(),
        name: roleName,
        description: roleDescription,
        permissions: permissions.filter(p => selectedPermissions.includes(p.id)),
        is_active: isActive,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (editingRole) {
        setRoles(roles.map(r => r.id === editingRole.id ? newRole : r));
      } else {
        setRoles([...roles, newRole]);
      }
      setShowForm(false);
      resetForm();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description);
    setSelectedPermissions(role.permissions.map(p => p.id));
    setIsActive(role.is_active);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`http://localhost:8000/api/roles/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      // For demo purposes, simulate deletion
      setRoles(roles.filter(r => r.id !== id));
    }
  };

  const confirmDeleteRole = (role: Role) => {
    openConfirm(
      'Delete Role',
      `Are you sure you want to delete the "${role.name}" role? This action cannot be undone.`,
      async () => {
        await handleDelete(role.id);
        closeConfirm();
      }
    );
  };

  const openPermissionsModal = (role: Role) => {
    setActiveRole(role);
    setSelectedPermissions(role.permissions.map(p => p.id));
    setShowPermissionsModal(true);
  };

  const handlePermissionToggle = (permissionId: number) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const savePermissions = async () => {
    if (!activeRole) return;

    try {
      await axios.put(`http://localhost:8000/api/roles/${activeRole.id}/permissions`, {
        permissions: selectedPermissions
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRoles();
      setShowPermissionsModal(false);
    } catch (error) {
      console.error('Error saving permissions:', error);
      // For demo purposes, simulate success
      const updatedRole = {
        ...activeRole,
        permissions: permissions.filter(p => selectedPermissions.includes(p.id))
      };
      setRoles(roles.map(r => r.id === activeRole.id ? updatedRole : r));
      setShowPermissionsModal(false);
    }
  };

  const openAssignModal = () => {
    setSelectedUser('');
    setSelectedRole('');
    setShowAssignModal(true);
  };

  const assignRole = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      await axios.post('http://localhost:8000/api/roles/assign-to-user', {
        user_id: selectedUser,
        role_id: selectedRole
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowAssignModal(false);
    } catch (error) {
      console.error('Error assigning role:', error);
      // For demo purposes, simulate success
      setShowAssignModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard/hrm')}
                className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors duration-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to HRM</span>
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Add Role
              </button>
              <button
                onClick={openAssignModal}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Assign Role
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-2xl">
              🔐
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Roles & Privileges</h1>
              <p className="text-gray-600">Manage user roles and access permissions</p>
            </div>
          </div>
        </div>

        {/* Roles Table */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">User Roles</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Role Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {role.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {role.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {role.permissions.length} permissions
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        role.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {role.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="relative" ref={openMenuFor === role.id ? menuRef : undefined}>
                        <button
                          aria-haspopup="menu"
                          aria-expanded={openMenuFor === role.id}
                          aria-controls={`row-menu-${role.id}`}
                          onClick={() => {
                            const willOpen = openMenuFor !== role.id;
                            setOpenMenuFor(willOpen ? role.id : null);
                          }}
                          className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          title="More actions"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </button>
                        {openMenuFor === role.id && (
                          <div
                            id={`row-menu-${role.id}`}
                            role="menu"
                            tabIndex={-1}
                            className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-[99]"
                          >
                            <button role="menuitem" onClick={() => { openPermissionsModal(role); setOpenMenuFor(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50">
                              <span className="w-4 h-4">🔑</span>
                              <span>Manage Permissions</span>
                            </button>
                            <button role="menuitem" onClick={() => { handleEdit(role); setOpenMenuFor(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50">
                              <span className="w-4 h-4">✏️</span>
                              <span>Edit</span>
                            </button>
                            <div className="my-1 h-px bg-gray-200" />
                            <button role="menuitem" onClick={() => { confirmDeleteRole(role); setOpenMenuFor(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50">
                              <span className="w-4 h-4">🗑️</span>
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Role Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6 rounded-t-2xl">
              <h3 className="text-xl font-bold text-white">
                {editingRole ? 'Edit Role' : 'Add New Role'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Use Designation (optional)
                  </label>
                  <select
                    value={selectedDesignationId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedDesignationId(val);
                      const chosen = designations.find(d => String(d.id) === val);
                      if (chosen) setRoleName(chosen.name);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors duration-200 text-gray-900"
                  >
                    <option value="">Choose a designation</option>
                    {designations.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2 mb-3">
                    Permissions
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-4 bg-gray-50">
                    {permissions.map((permission) => (
                      <label key={permission.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white transition-colors duration-200">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission.id)}
                          onChange={() => handlePermissionToggle(permission.id)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{permission.name}</p>
                          <p className="text-xs text-gray-600">{permission.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </div>
                  ) : (
                    <span>{editingRole ? 'Update Role' : 'Create Role'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && activeRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPermissionsModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white text-lg">
                  🔑
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Manage Permissions</h3>
                  <p className="text-sm text-gray-600">Configure permissions for "{activeRole.name}"</p>
                </div>
              </div>
              <button onClick={() => setShowPermissionsModal(false)} className="absolute top-4 right-4 bg-gradient-to-r from-red-500 to-red-600 text-white p-2 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 hover:from-red-600 hover:to-red-700">✕</button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {permissions.map((permission) => (
                  <div key={permission.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors duration-200">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{permission.name}</h4>
                      <p className="text-xs text-gray-600">{permission.description}</p>
                      <span className="inline-block mt-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">{permission.module}</span>
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(permission.id)}
                        onChange={() => handlePermissionToggle(permission.id)}
                        className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowPermissionsModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={savePermissions}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-6 py-2 rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
                >
                  Save Permissions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Role Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAssignModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white text-lg">
                  👤
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Assign Role</h3>
                  <p className="text-sm text-gray-600">Assign a role to a user</p>
                </div>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="absolute top-4 right-4 bg-gradient-to-r from-red-500 to-red-600 text-white p-2 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 hover:from-red-600 hover:to-red-700">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select User
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors duration-200 text-gray-900"
                >
                  <option value="">Choose a user</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors duration-200 text-gray-900"
                >
                  <option value="">Choose a role</option>
                  {roles.filter(role => role.is_active).map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={assignRole}
                  disabled={!selectedUser || !selectedRole}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-2 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeConfirm} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{confirmTitle || 'Confirm'}</h3>
              <button onClick={closeConfirm} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="text-gray-700 mb-6">{confirmMessage || 'Are you sure?'}</div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeConfirm}
                className="px-5 py-2 rounded-xl bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => { if (confirmAction) await confirmAction(); }}
                className="px-5 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}