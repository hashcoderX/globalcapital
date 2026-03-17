'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface Payroll {
  id: number;
  employee_id: number;
  month_year: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  working_days: number;
  present_days: number;
  absent_days: number;
  overtime_hours: number;
  overtime_amount: number;
  status: 'pending' | 'processed' | 'paid';
  processed_at?: string;
  employee: {
    id: number;
    employee_code: string;
    first_name: string;
    last_name: string;
    email: string;
    department: { id: number; name: string };
    designation: { id: number; name: string };
  };
}

interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  basic_salary: number;
  department: { id: number; name: string };
  designation: { id: number; name: string };
}

interface Branch {
  id: number;
  name: string;
  currency?: string;
}

export default function Payroll() {
  const [token, setToken] = useState('');
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const router = useRouter();

  // Generate payroll form fields
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [generateLoading, setGenerateLoading] = useState(false);

  // Filter states
  const [filterMonth, setFilterMonth] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void> | void) | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
    } else {
      setToken(storedToken);
      fetchPayrolls(storedToken);
      fetchEmployees(storedToken);
      fetchBranches(storedToken);
    }
  }, [router]);

  const fetchPayrolls = async (authToken: string) => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterMonth) params.month_year = filterMonth;
      if (filterBranch) params.branch_id = filterBranch;

      const response = await axios.get('http://localhost:8000/api/hr/payrolls', {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { ...params, per_page: 1000 }
      });

      const payrollsData = response.data.data || response.data;
      setPayrolls(Array.isArray(payrollsData) ? payrollsData : []);
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      setPayrolls([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async (authToken: string) => {
    try {
      const response = await axios.get('http://localhost:8000/api/hr/employees', {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { per_page: 1000 }
      });

      const employeesData = response.data.data || response.data;
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    }
  };

  const fetchBranches = async (authToken: string) => {
    try {
      const response = await axios.get('http://localhost:8000/api/companies', {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { per_page: 1000 }
      });

      const branchesData = response.data.data || response.data;
      setBranches(Array.isArray(branchesData) ? branchesData : []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches([]);
    }
  };

  const handleGeneratePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedBranch || !selectedMonth) return;

    try {
      setGenerateLoading(true);

      const response = await axios.post('http://localhost:8000/api/hr/payrolls/generate', {
        branch_id: parseInt(selectedBranch),
        month_year: selectedMonth,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowGenerateModal(false);
      setSelectedBranch('');
      setSelectedMonth('');
      fetchPayrolls(token);

      // Show success message
      showNotice('Success', `Payroll generated successfully for ${response.data.payrolls.length} employees!`, 'success');
    } catch (error) {
      console.error('Error generating payroll:', error);
      showNotice('Error', 'Failed to generate payroll. Please try again.', 'error');
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleStatusUpdate = async (payrollId: number, newStatus: 'pending' | 'processed' | 'paid') => {
    if (!token) return;

    try {
      await axios.put(`http://localhost:8000/api/hr/payrolls/${payrollId}`, {
        status: newStatus,
        processed_at: newStatus === 'processed' ? new Date().toISOString().split('T')[0] : null,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchPayrolls(token);
      showNotice('Success', `Payroll status updated to ${newStatus}!`, 'success');
    } catch (error) {
      console.error('Error updating payroll status:', error);
      showNotice('Error', 'Failed to update payroll status.', 'error');
    }
  };

  const handleViewPayslip = (payroll: Payroll) => {
    setSelectedPayroll(payroll);
    setShowPayslipModal(true);
  };

  const handleDownloadPayslip = async (payroll: Payroll) => {
    if (!token) return;

    try {
      const response = await axios.get(`http://localhost:8000/api/hr/payrolls/${payroll.id}/payslip`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip_${payroll.employee.employee_code}_${payroll.month_year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading payslip:', error);
      showNotice('Error', 'Failed to download payslip.', 'error');
    }
  };

  const showNotice = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    // Simple notification - you can replace with a proper toast library
    alert(`${title}: ${message}`);
  };

  const resetFilters = () => {
    setFilterMonth('');
    setFilterBranch('');
    setFilterStatus('');
    if (token) fetchPayrolls(token);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processed': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
              <p className="text-gray-600 mt-1">Process and manage employee payroll</p>
            </div>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Generate Payroll
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Month/Year</label>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              >
                <option value="">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="processed">Processed</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => token && fetchPayrolls(token)}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-6 py-2 rounded-lg font-medium transition-all duration-300 mr-2"
              >
                Apply Filters
              </button>
              <button
                onClick={resetFilters}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-all duration-300"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month/Year
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Basic Salary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Allowances
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deductions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net Salary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payrolls
                    .filter(payroll => !filterStatus || payroll.status === filterStatus)
                    .map((payroll) => (
                    <tr key={payroll.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {payroll.employee.first_name} {payroll.employee.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {payroll.employee.employee_code}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payroll.month_year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(payroll.basic_salary)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(payroll.allowances)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(payroll.deductions)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(payroll.net_salary)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payroll.status)}`}>
                          {payroll.status.charAt(0).toUpperCase() + payroll.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewPayslip(payroll)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDownloadPayslip(payroll)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Download
                          </button>
                          {payroll.status === 'pending' && (
                            <button
                              onClick={() => handleStatusUpdate(payroll.id, 'processed')}
                              className="text-purple-600 hover:text-purple-900"
                            >
                              Process
                            </button>
                          )}
                          {payroll.status === 'processed' && (
                            <button
                              onClick={() => handleStatusUpdate(payroll.id, 'paid')}
                              className="text-green-600 hover:text-green-900"
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payrolls.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No payroll records found.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Generate Payroll Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 rounded-t-2xl">
              <h3 className="text-xl font-bold text-white">Generate Payroll</h3>
            </div>
            <form onSubmit={handleGeneratePayroll} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  required
                >
                  <option value="">Select Branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month/Year</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  required
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generateLoading}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-6 py-2 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
                >
                  {generateLoading ? 'Generating...' : 'Generate Payroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payslip Modal */}
      {showPayslipModal && selectedPayroll && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 rounded-t-2xl">
              <h3 className="text-xl font-bold text-white">Employee Payslip</h3>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">Employee Details</h4>
                    <p className="text-sm text-gray-600">Name: {selectedPayroll.employee.first_name} {selectedPayroll.employee.last_name}</p>
                    <p className="text-sm text-gray-600">Code: {selectedPayroll.employee.employee_code}</p>
                    <p className="text-sm text-gray-600">Department: {selectedPayroll.employee.department.name}</p>
                    <p className="text-sm text-gray-600">Designation: {selectedPayroll.employee.designation.name}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Payroll Details</h4>
                    <p className="text-sm text-gray-600">Month/Year: {selectedPayroll.month_year}</p>
                    <p className="text-sm text-gray-600">Status: <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedPayroll.status)}`}>{selectedPayroll.status}</span></p>
                    <p className="text-sm text-gray-600">Working Days: {selectedPayroll.working_days}</p>
                    <p className="text-sm text-gray-600">Present Days: {selectedPayroll.present_days}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-4">Salary Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Basic Salary:</span>
                      <span className="text-sm font-medium">{formatCurrency(selectedPayroll.basic_salary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Allowances:</span>
                      <span className="text-sm font-medium text-green-600">+{formatCurrency(selectedPayroll.allowances)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Deductions:</span>
                      <span className="text-sm font-medium text-red-600">-{formatCurrency(selectedPayroll.deductions)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-lg font-semibold text-gray-900">Net Salary:</span>
                      <span className="text-lg font-bold text-blue-600">{formatCurrency(selectedPayroll.net_salary)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => handleDownloadPayslip(selectedPayroll)}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-2 rounded-lg font-medium transition-all duration-300"
                >
                  Download PDF
                </button>
                <button
                  onClick={() => setShowPayslipModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}