'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface EmployeeAllowanceDeduction {
  id: number;
  employee_id: number;
  name: string;
  amount: number;
  type: 'allowance' | 'deduction';
  amount_type: 'fixed' | 'percentage';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  date_of_birth: string;
  hire_date: string;
  basic_salary: number;
  commission?: number;
  commission_base?: 'company_profit' | 'own_business';
  overtime_payment_per_hour?: number;
  deduction_late_hour?: number;
  status: 'active' | 'inactive';
  department: { id: number; name: string };
  designation: { id: number; name: string };
  branch: { id: number; name: string };
}

interface EmployeeDocument {
  id: number;
  type: string;
  file_path: string;
  original_name?: string;
  notes?: string;
  created_at?: string;
}

interface EmployeeEducation {
  id: number;
  institution: string;
  degree?: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
  grade?: string;
  description?: string;
}

interface EmployeeExperience {
  id: number;
  company: string;
  role: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  responsibilities?: string;
  achievements?: string;
}

type EmployeeFull = Employee & {
  documents?: EmployeeDocument[];
  educations?: EmployeeEducation[];
  experiences?: EmployeeExperience[];
};

interface Department {
  id: number;
  name: string;
}

interface Designation {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
  currency?: string;
}

interface LeaveType {
  id: number;
  name: string;
  code: string;
  description?: string;
  max_days_per_year: number;
  requires_documentation: boolean;
  is_active: boolean;
}

interface EmployeeLeaveBalance {
  leave_type_id: number;
  leave_type_name: string;
  balance: number;
  accrual_rate: number;
}

export default function Employees() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const [token, setToken] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showEduModal, setShowEduModal] = useState(false);
  const [showExpModal, setShowExpModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
  const [profileEmployee, setProfileEmployee] = useState<EmployeeFull | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const router = useRouter();

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [photoPath, setPhotoPath] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [commission, setCommission] = useState('');
  const [commissionBase, setCommissionBase] = useState<'company_profit' | 'own_business' | ''>('');
  const [overtimePaymentPerHour, setOvertimePaymentPerHour] = useState('');
  const [deductionLateHour, setDeductionLateHour] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Documents state
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [docType, setDocType] = useState('cv');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docNotes, setDocNotes] = useState('');

  // Allowances and Deductions state
  const [allowancesDeductions, setAllowancesDeductions] = useState<EmployeeAllowanceDeduction[]>([]);
  const [showAllowancesModal, setShowAllowancesModal] = useState(false);
  const [allowanceDeductionName, setAllowanceDeductionName] = useState('');
  const [allowanceDeductionAmount, setAllowanceDeductionAmount] = useState('');
  const [allowanceDeductionType, setAllowanceDeductionType] = useState<'allowance' | 'deduction'>('allowance');
  const [allowanceDeductionAmountType, setAllowanceDeductionAmountType] = useState<'fixed' | 'percentage'>('fixed');
  const [editingAllowanceDeduction, setEditingAllowanceDeduction] = useState<EmployeeAllowanceDeduction | null>(null);

  // Education state
  const [educations, setEducations] = useState<EmployeeEducation[]>([]);
  const [eduInstitution, setEduInstitution] = useState('');
  const [eduDegree, setEduDegree] = useState('');
  const [eduField, setEduField] = useState('');
  const [eduStart, setEduStart] = useState('');
  const [eduEnd, setEduEnd] = useState('');
  const [eduGrade, setEduGrade] = useState('');
  const [eduDescription, setEduDescription] = useState('');

  // Experience state
  const [experiences, setExperiences] = useState<EmployeeExperience[]>([]);
  const [expCompany, setExpCompany] = useState('');
  const [expRole, setExpRole] = useState('');
  const [expStart, setExpStart] = useState('');
  const [expEnd, setExpEnd] = useState('');
  const [expCurrent, setExpCurrent] = useState(false);
  const [expResp, setExpResp] = useState('');
  const [expAch, setExpAch] = useState('');

  // Leave details state
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employeeLeaveBalances, setEmployeeLeaveBalances] = useState<EmployeeLeaveBalance[]>([]);
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [leaveBalance, setLeaveBalance] = useState('');
  const [accrualRate, setAccrualRate] = useState('');

  // Actions menu state
  const [openMenuFor, setOpenMenuFor] = useState<number | null>(null);
  const [openAttendanceFor, setOpenAttendanceFor] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenuFor && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuFor(null);
        setOpenAttendanceFor(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuFor(null);
        setOpenAttendanceFor(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [openMenuFor]);

  // Confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void> | void) | null>(null);

  const openConfirm = (title: string, message: string, onConfirm: () => Promise<void> | void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmAction(() => onConfirm);
    setConfirmOpen(true);
  };
  const closeConfirm = () => {
    setConfirmOpen(false);
    setConfirmTitle('');
    setConfirmMessage('');
    setConfirmAction(null);
  };

  // Notification modal state
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [noticeType, setNoticeType] = useState<'success' | 'error' | 'info'>('info');
  const showNotice = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNoticeTitle(title);
    setNoticeMessage(message);
    setNoticeType(type);
    setNoticeOpen(true);
  };
  const closeNotice = () => {
    setNoticeOpen(false);
    setNoticeTitle('');
    setNoticeMessage('');
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
    } else {
      setToken(storedToken);
      fetchEmployees(storedToken);
      fetchDepartments(storedToken);
      fetchDesignations(storedToken);
      fetchBranches(storedToken);
      fetchLeaveTypes(storedToken);
    }
  }, [router]);

  const fetchEmployees = async (authToken?: string) => {
    const tokenToUse = authToken || token;
    if (!tokenToUse) return;
    
    try {
      const response = await axios.get('http://localhost:8000/api/hr/employees', {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      });
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchDepartments = async (authToken?: string) => {
    const tokenToUse = authToken || token;
    if (!tokenToUse) return;
    
    try {
      const response = await axios.get('http://localhost:8000/api/hr/departments', {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      });
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchDesignations = async (authToken?: string) => {
    const tokenToUse = authToken || token;
    if (!tokenToUse) return;
    
    try {
      const response = await axios.get('http://localhost:8000/api/hr/designations', {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      });
      setDesignations(response.data.data || []);
    } catch (error) {
      console.error('Error fetching designations:', error);
    }
  };

  const fetchBranches = async (authToken?: string) => {
    const tokenToUse = authToken || token;
    if (!tokenToUse) return;
    
    try {
      const response = await axios.get('http://localhost:8000/api/companies', {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      });
      setBranches(response.data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchLeaveTypes = async (authToken?: string) => {
    const tokenToUse = authToken || token;
    if (!tokenToUse) return;

    try {
      const response = await axios.get('http://localhost:8000/api/hr/leave-types', {
        headers: { Authorization: `Bearer ${tokenToUse}` },
        params: { per_page: 1000 }
      });
      setLeaveTypes(response.data.data || []);
    } catch (error) {
      console.error('Error fetching leave types:', error);
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setAddress('');
    setPhotoPath('');
    setDateOfBirth('');
    setHireDate('');
    setBasicSalary('');
    setCommission('');
    setCommissionBase('');
    setOvertimePaymentPerHour('');
    setDeductionLateHour('');
    setDepartmentId('');
    setDesignationId('');
    setBranchId('');
    setStatus('active');
    setEmployeeLeaveBalances([]);
    setSelectedLeaveType('');
    setLeaveBalance('');
    setAccrualRate('');
    setEditingEmployee(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (!firstName || !lastName || !email || !password || !hireDate || !basicSalary || !departmentId || !designationId || !branchId) {
      showNotice('Validation Error', 'Please fill in all required fields.', 'error');
      setLoading(false);
      return;
    }

    const employeeData = {
      first_name: firstName,
      last_name: lastName,
      email,
      password,
      phone,
      address,
      photo_path: photoPath || undefined,
      date_of_birth: dateOfBirth,
      hire_date: hireDate,
      basic_salary: parseFloat(basicSalary),
      commission: commission ? parseFloat(commission) : undefined,
      commission_base: commissionBase || undefined,
      overtime_payment_per_hour: overtimePaymentPerHour ? parseFloat(overtimePaymentPerHour) : undefined,
      deduction_late_hour: deductionLateHour ? parseFloat(deductionLateHour) : undefined,
      department_id: parseInt(departmentId),
      designation_id: parseInt(designationId),
      branch_id: parseInt(branchId),
      status,
      leave_balances: employeeLeaveBalances.length > 0 ? employeeLeaveBalances : undefined,
    };

    try {
      if (editingEmployee) {
        await axios.put(`http://localhost:8000/api/hr/employees/${editingEmployee.id}`, employeeData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post('http://localhost:8000/api/hr/employees', employeeData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      fetchEmployees();
      setShowForm(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving employee:', error);
      if (error.response?.status === 403) {
        showNotice('Permission Denied', 'Your account does not have permission to create or edit employees.', 'error');
      } else if (error.response && error.response.data && error.response.data.errors) {
        const errorMessages = Object.values(error.response.data.errors).flat().join('\n');
        showNotice('Validation Error', errorMessages, 'error');
      } else {
        showNotice('Error', 'Failed to save employee. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFirstName(employee.first_name);
    setLastName(employee.last_name);
    setEmail(employee.email);
    setPhone(employee.phone);
    setAddress(employee.address);
    setPhotoPath((employee as any)?.photo_path || '');
    setDateOfBirth(employee.date_of_birth);
    setHireDate(employee.hire_date);
    setBasicSalary(employee.basic_salary.toString());
    setCommission(employee.commission ? employee.commission.toString() : '');
    setCommissionBase(employee.commission_base || '');
    setOvertimePaymentPerHour(employee.overtime_payment_per_hour ? employee.overtime_payment_per_hour.toString() : '');
    setDeductionLateHour(employee.deduction_late_hour ? employee.deduction_late_hour.toString() : '');
    setDepartmentId(employee.department.id.toString());
    setDesignationId(employee.designation.id.toString());
    setBranchId(employee.branch.id.toString());
    setStatus(employee.status);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/api/hr/employees/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchEmployees();
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      if (error?.response?.status === 403) {
        showNotice('Permission Denied', error?.response?.data?.message || 'You do not have permission to delete employees.', 'error');
      } else {
        showNotice('Error', error?.response?.data?.message || 'Failed to delete employee. Please try again.', 'error');
      }
    }
  };

  const confirmDeleteEmployee = (employee: Employee) => {
    openConfirm(
      'Delete Employee',
      `Are you sure you want to delete ${employee.first_name} ${employee.last_name}?`,
      async () => {
        await handleDelete(employee.id);
        closeConfirm();
      }
    );
  };

  const openProfile = async (employee: Employee) => {
    try {
      setProfileLoading(true);
      setShowProfileModal(true);
      const response = await axios.get(`http://localhost:8000/api/hr/employees/${employee.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfileEmployee(response.data as EmployeeFull);
      setActiveEmployee(employee);
    } catch (error) {
      console.error('Error loading employee profile:', error);
      showNotice('Error', 'Failed to load employee profile', 'error');
      setShowProfileModal(false);
    } finally {
      setProfileLoading(false);
    }
  };

  const addLeaveBalance = () => {
    if (!selectedLeaveType || !leaveBalance) return;

    const leaveType = leaveTypes.find(lt => lt.id.toString() === selectedLeaveType);
    if (!leaveType) return;

    const newBalance: EmployeeLeaveBalance = {
      leave_type_id: leaveType.id,
      leave_type_name: leaveType.name,
      balance: parseFloat(leaveBalance),
      accrual_rate: parseFloat(accrualRate) || 0,
    };

    setEmployeeLeaveBalances([...employeeLeaveBalances, newBalance]);
    setSelectedLeaveType('');
    setLeaveBalance('');
    setAccrualRate('');
  };

  const removeLeaveBalance = (index: number) => {
    setEmployeeLeaveBalances(employeeLeaveBalances.filter((_, i) => i !== index));
  };

  const markAttendance = async (
    employee: Employee,
    status: 'present' | 'absent' | 'late' | 'half_day'
  ) => {
    if (!token) return;
    try {
      await axios.post(
        'http://localhost:8000/api/hr/attendance/mark',
        { employee_id: employee.id, status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showNotice('Success', `Marked ${status} for ${employee.first_name} ${employee.last_name}`, 'success');
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      if (error.response?.status === 409) {
        // Attendance already marked for today
        const existingRecord = error.response.data?.existing_record;
        const date = existingRecord?.date || 'today';
        const currentStatus = existingRecord?.status;
        showNotice('Already Marked', `Attendance for ${employee.first_name} ${employee.last_name} is already marked as ${currentStatus} on ${date}`, 'info');
      } else {
        showNotice('Error', 'Failed to mark attendance.', 'error');
      }
    }
  };

  const openDocs = (employee: Employee) => {
    setActiveEmployee(employee);
    setShowDocsModal(true);
    // Fetch documents for this employee
    fetchEmployeeDocuments(employee.id);
  };

  const openEdu = (employee: Employee) => {
    setActiveEmployee(employee);
    setShowEduModal(true);
    // Fetch education for this employee
    fetchEmployeeEducation(employee.id);
  };

  const openExp = (employee: Employee) => {
    setActiveEmployee(employee);
    setShowExpModal(true);
    // Fetch experience for this employee
    fetchEmployeeExperience(employee.id);
  };

  const openAllowances = (employee: Employee) => {
    setActiveEmployee(employee);
    setShowAllowancesModal(true);
    // Fetch allowances and deductions for this employee
    fetchAllowancesDeductions(employee.id);
  };

  const openLeaveManagement = (employee: Employee) => {
    setActiveEmployee(employee);
    setShowLeaveModal(true);
    // Reset leave form fields
    setSelectedLeaveType('');
    setLeaveBalance('');
    setAccrualRate('');
    setEmployeeLeaveBalances([]);
  };

  const getActiveCurrency = () => {
    const branch = branches.find((b) => b.id === activeEmployee?.branch.id);
    return (branch?.currency && branch.currency.trim()) ? branch.currency : 'LKR';
  };

  const fetchEmployeeDocuments = async (employeeId: number) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/hr/employees/${employeeId}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocuments(response.data || []);
    } catch (error) {
      console.error('Error fetching employee documents:', error);
    }
  };

  const fetchEmployeeEducation = async (employeeId: number) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/hr/employees/${employeeId}/education`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEducations(response.data || []);
    } catch (error) {
      console.error('Error fetching employee education:', error);
    }
  };

  const fetchEmployeeExperience = async (employeeId: number) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/hr/employees/${employeeId}/experience`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setExperiences(response.data || []);
    } catch (error) {
      console.error('Error fetching employee experience:', error);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmployee || !docFile) return;

    const formData = new FormData();
    formData.append('type', docType);
    formData.append('file', docFile);
    if (docNotes) formData.append('notes', docNotes);

    try {
      await axios.post(`http://localhost:8000/api/hr/employees/${activeEmployee.id}/documents`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchEmployeeDocuments(activeEmployee.id);
      setDocFile(null);
      setDocNotes('');
      showNotice('Success', 'Document added successfully!', 'success');
    } catch (error) {
      console.error('Error adding document:', error);
      showNotice('Error', 'Failed to add document. Please try again.', 'error');
    }
  };

  const handleAddEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmployee) return;

    const educationData = {
      institution: eduInstitution,
      degree: eduDegree || undefined,
      field_of_study: eduField || undefined,
      start_date: eduStart || undefined,
      end_date: eduEnd || undefined,
      grade: eduGrade || undefined,
      description: eduDescription || undefined,
    };

    try {
      await axios.post(`http://localhost:8000/api/hr/employees/${activeEmployee.id}/education`, educationData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchEmployeeEducation(activeEmployee.id);
      setEduInstitution('');
      setEduDegree('');
      setEduField('');
      setEduStart('');
      setEduEnd('');
      setEduGrade('');
      setEduDescription('');
      showNotice('Success', 'Education added successfully!', 'success');
    } catch (error) {
      console.error('Error adding education:', error);
      showNotice('Error', 'Failed to add education. Please try again.', 'error');
    }
  };

  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmployee) return;

    const experienceData = {
      company: expCompany,
      role: expRole,
      start_date: expStart || undefined,
      end_date: expCurrent ? undefined : (expEnd || undefined),
      is_current: expCurrent,
      responsibilities: expResp || undefined,
      achievements: expAch || undefined,
    };

    try {
      await axios.post(`http://localhost:8000/api/hr/employees/${activeEmployee.id}/experience`, experienceData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchEmployeeExperience(activeEmployee.id);
      setExpCompany('');
      setExpRole('');
      setExpStart('');
      setExpEnd('');
      setExpCurrent(false);
      setExpResp('');
      setExpAch('');
      showNotice('Success', 'Experience added successfully!', 'success');
    } catch (error) {
      console.error('Error adding experience:', error);
      showNotice('Error', 'Failed to add experience. Please try again.', 'error');
    }
  };

  const downloadDocument = async (doc: EmployeeDocument) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/hr/employees/${activeEmployee?.id}/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.original_name || 'document');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading document:', error);
      showNotice('Error', 'Failed to download document. Please try again.', 'error');
    }
  };

  // Allowances and Deductions functions
  const fetchAllowancesDeductions = async (employeeId: number) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/hr/employees/${employeeId}/allowances-deductions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllowancesDeductions(response.data);
    } catch (error) {
      console.error('Error fetching allowances and deductions:', error);
    }
  };

  const handleAddAllowanceDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmployee) return;

    const allowanceDeductionData = {
      employee_id: activeEmployee.id,
      name: allowanceDeductionName,
      amount: parseFloat(allowanceDeductionAmount),
      type: allowanceDeductionType,
      amount_type: allowanceDeductionAmountType,
    };

    try {
      if (editingAllowanceDeduction) {
        await axios.put(`http://localhost:8000/api/hr/employees/${activeEmployee.id}/allowances-deductions/${editingAllowanceDeduction.id}`, allowanceDeductionData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showNotice('Success', 'Allowance/Deduction updated successfully!', 'success');
      } else {
        await axios.post(`http://localhost:8000/api/hr/employees/${activeEmployee.id}/allowances-deductions`, allowanceDeductionData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showNotice('Success', 'Allowance/Deduction added successfully!', 'success');
      }
      fetchAllowancesDeductions(activeEmployee.id);
      resetAllowanceDeductionForm();
    } catch (error) {
      console.error('Error saving allowance/deduction:', error);
      showNotice('Error', 'Failed to save allowance/deduction. Please try again.', 'error');
    }
  };

  const handleEditAllowanceDeduction = (allowanceDeduction: EmployeeAllowanceDeduction) => {
    setEditingAllowanceDeduction(allowanceDeduction);
    setAllowanceDeductionName(allowanceDeduction.name);
    setAllowanceDeductionAmount(allowanceDeduction.amount.toString());
    setAllowanceDeductionType(allowanceDeduction.type);
    setAllowanceDeductionAmountType(allowanceDeduction.amount_type);
  };

  const handleDeleteAllowanceDeduction = async (allowanceDeduction: EmployeeAllowanceDeduction) => {
    if (!activeEmployee) return;
    try {
      await axios.delete(`http://localhost:8000/api/hr/employees/${activeEmployee.id}/allowances-deductions/${allowanceDeduction.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAllowancesDeductions(activeEmployee.id);
      showNotice('Success', 'Allowance/Deduction deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting allowance/deduction:', error);
      showNotice('Error', 'Failed to delete allowance/deduction. Please try again.', 'error');
    }
  };

  const confirmDeleteAllowanceDeduction = (allowanceDeduction: EmployeeAllowanceDeduction) => {
    openConfirm(
      'Delete Allowance/Deduction',
      `Are you sure you want to delete "${allowanceDeduction.name}"?`,
      async () => {
        await handleDeleteAllowanceDeduction(allowanceDeduction);
        closeConfirm();
      }
    );
  };

  const resetAllowanceDeductionForm = () => {
    setAllowanceDeductionName('');
    setAllowanceDeductionAmount('');
    setAllowanceDeductionType('allowance');
    setAllowanceDeductionAmountType('fixed');
    setEditingAllowanceDeduction(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
      </div>

      {/* Modern Navigation */}
      <nav className="relative z-10 bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard/hrm')}
                className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors duration-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Back to HRM</span>
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Employee System Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  👥
                </div>
                <span className="font-medium text-gray-900">Employee Management</span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                👥
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Employee Management</h2>
                <p className="text-gray-600">Manage your workforce efficiently with comprehensive employee tools</p>
              </div>
            </div>
            <div className="flex space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{employees.length}</div>
                <div className="text-sm text-gray-500">Total Employees</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{employees.filter(e => e.status === 'active').length}</div>
                <div className="text-sm text-gray-500">Active Employees</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{departments.length}</div>
                <div className="text-sm text-gray-500">Departments</div>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Employee</span>
          </button>
        </div>

        {/* Employee List */}
        <div className="bg-white/70 backdrop-blur-sm shadow-xl rounded-2xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                📋
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Employee Directory</h3>
                <p className="text-white/80">View and manage all employee records</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Employee Code
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Designation
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Branch
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
                {employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {employee.employee_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.first_name} {employee.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.department.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.designation.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.branch.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        employee.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="relative" ref={openMenuFor === employee.id ? menuRef : undefined}>
                        <button
                          aria-haspopup="menu"
                          aria-expanded={openMenuFor === employee.id}
                          aria-controls={`row-menu-${employee.id}`}
                          onClick={() => {
                            const willOpen = openMenuFor !== employee.id;
                            setOpenMenuFor(willOpen ? employee.id : null);
                            setOpenAttendanceFor(null);
                          }}
                          className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          title="More actions"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </button>
                        {openMenuFor === employee.id && (
                          <div
                            id={`row-menu-${employee.id}`}
                            role="menu"
                            tabIndex={-1}
                            className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-[99]"
                          >
                            <button role="menuitem" onClick={() => { openProfile(employee); setOpenMenuFor(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50">
                              <span className="w-4 h-4">👁️</span>
                              <span>View</span>
                            </button>
                            <button role="menuitem" onClick={() => { handleEdit(employee); setOpenMenuFor(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50">
                              <span className="w-4 h-4">✏️</span>
                              <span>Edit</span>
                            </button>
                            <button role="menuitem" onClick={() => { openEdu(employee); setOpenMenuFor(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50">
                              <span className="w-4 h-4">🎓</span>
                              <span>Education</span>
                            </button>
                            <button role="menuitem" onClick={() => { openExp(employee); setOpenMenuFor(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50">
                              <span className="w-4 h-4">💼</span>
                              <span>Experience</span>
                            </button>
                            <button role="menuitem" onClick={() => { openDocs(employee); setOpenMenuFor(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50">
                              <span className="w-4 h-4">📄</span>
                              <span>Documents</span>
                            </button>
                            <button role="menuitem" onClick={() => { openAllowances(employee); setOpenMenuFor(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50">
                              <span className="w-4 h-4">💲</span>
                              <span>Allowances</span>
                            </button>
                            <button role="menuitem" onClick={() => { openLeaveManagement(employee); setOpenMenuFor(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50">
                              <span className="w-4 h-4">📅</span>
                              <span>Leave Management</span>
                            </button>
                            <div className="my-1 h-px bg-gray-200" />
                            <div className="relative">
                              <button
                                role="menuitem"
                                onClick={() => setOpenAttendanceFor(openAttendanceFor === employee.id ? null : employee.id)}
                                className="w-full flex items-center justify-between px-3 py-2 text-left text-gray-700 hover:bg-gray-50"
                                aria-haspopup="menu"
                                aria-expanded={openAttendanceFor === employee.id}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="w-4 h-4">🗓️</span>
                                  <span>Attendance</span>
                                </span>
                                <svg className={`w-4 h-4 transform transition ${openAttendanceFor === employee.id ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path d="M6 6l6 4-6 4V6z"/></svg>
                              </button>
                              {openAttendanceFor === employee.id && (
                                <div role="menu" tabIndex={-1} className="absolute right-full top-0 mr-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-[99]">
                                  <button role="menuitem" onClick={() => { markAttendance(employee, 'present'); setOpenMenuFor(null); setOpenAttendanceFor(null); }} className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50">Mark Present</button>
                                  <button role="menuitem" onClick={() => { markAttendance(employee, 'absent'); setOpenMenuFor(null); setOpenAttendanceFor(null); }} className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50">Mark Absent</button>
                                </div>
                              )}
                            </div>
                            <div className="my-1 h-px bg-gray-200" />
                            <button role="menuitem" onClick={() => { confirmDeleteEmployee(employee); setOpenMenuFor(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50">
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

      {/* Employee Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                    👤
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                    </h3>
                    <p className="text-white/80">
                      {editingEmployee ? 'Update employee information' : 'Create a new employee record'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-white/80 hover:text-white transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Image Path
                  </label>
                  <input
                    type="text"
                    value={photoPath}
                    onChange={(e) => setPhotoPath(e.target.value)}
                    placeholder="e.g., uploads/employees/photo.jpg or full URL"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hire Date *
                  </label>
                  <input
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Basic Salary *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commission (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                    placeholder="e.g., 5.50 for 5.5%"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commission Base
                  </label>
                  <select
                    value={commissionBase}
                    onChange={(e) => setCommissionBase(e.target.value as 'company_profit' | 'own_business' | '')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                  >
                    <option value="">Select Commission Base</option>
                    <option value="company_profit">Company Profit</option>
                    <option value="own_business">Own Business</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overtime Payment Per Hour
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={overtimePaymentPerHour}
                    onChange={(e) => setOvertimePaymentPerHour(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                    placeholder="e.g., 15.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deduction Late Hour
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={deductionLateHour}
                    onChange={(e) => setDeductionLateHour(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                    placeholder="e.g., 5.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department *
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Designation *
                  </label>
                  <select
                    value={designationId}
                    onChange={(e) => setDesignationId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                    required
                  >
                    <option value="">Select Designation</option>
                    {designations.map((desig) => (
                      <option key={desig.id} value={desig.id}>
                        {desig.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch *
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Leave Details Section */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                    📅
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Leave Details</h3>
                    <p className="text-sm text-gray-600">Configure initial leave balances and entitlements</p>
                  </div>
                </div>

                {/* Add Leave Balance Form */}
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-end">
                    {/* Leave Type - Medium width */}
                    <div className="flex-1 min-w-0">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Leave Type
                      </label>
                      <select
                        value={selectedLeaveType}
                        onChange={(e) => setSelectedLeaveType(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors duration-200 text-gray-900 bg-white"
                      >
                        <option value="">Select leave type</option>
                        {leaveTypes.filter(type => type.is_active).map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name} ({type.max_days_per_year} days/year)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Initial Balance - Small width */}
                    <div className="w-full sm:w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Initial Balance
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={leaveBalance}
                        onChange={(e) => setLeaveBalance(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors duration-200 text-gray-900 bg-white placeholder-gray-400"
                        placeholder="15.5"
                      />
                    </div>

                    {/* Monthly Accrual - Small width */}
                    <div className="w-full sm:w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Monthly Accrual
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        value={accrualRate}
                        onChange={(e) => setAccrualRate(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors duration-200 text-gray-900 bg-white placeholder-gray-400"
                        placeholder="1.25"
                      />
                    </div>

                    {/* Add Balance Button - Compact but prominent */}
                    <div className="w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={addLeaveBalance}
                        disabled={!selectedLeaveType || !leaveBalance}
                        className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                      >
                        Add Balance
                      </button>
                    </div>
                  </div>
                </div>

                {/* Leave Balances List */}
                {employeeLeaveBalances.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Configured Leave Balances</h4>
                    <div className="space-y-2">
                      {employeeLeaveBalances.map((balance, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors duration-200">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"></div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{balance.leave_type_name}</p>
                                <p className="text-xs text-gray-600">
                                  {balance.balance} days
                                  {balance.accrual_rate > 0 && (
                                    <span className="ml-2 text-emerald-600">• +{balance.accrual_rate}/month</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLeaveBalance(index)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors duration-200 ml-2"
                            title="Remove balance"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </div>
                  ) : (
                    <span>{editingEmployee ? 'Update Employee' : 'Create Employee'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowProfileModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto text-black">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  {profileEmployee?.first_name} {profileEmployee?.last_name}
                  <span className="text-sm font-normal text-gray-500">({profileEmployee?.employee_code})</span>
                </h3>
                <p className="text-black">{profileEmployee?.designation.name} at {profileEmployee?.department.name}</p>
              </div>
              <button onClick={() => setShowProfileModal(false)} className="absolute top-4 right-4 bg-gradient-to-r from-red-500 to-red-600 text-white p-2 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 hover:from-red-600 hover:to-red-700">✕</button>
            </div>

            {profileLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : profileEmployee ? (
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><strong>Email:</strong> {profileEmployee.email}</div>
                    <div><strong>Phone:</strong> {profileEmployee.phone || 'N/A'}</div>
                    <div><strong>Date of Birth:</strong> {profileEmployee.date_of_birth || 'N/A'}</div>
                    <div><strong>Hire Date:</strong> {profileEmployee.hire_date}</div>
                    <div><strong>Department:</strong> {profileEmployee.department.name}</div>
                    <div><strong>Designation:</strong> {profileEmployee.designation.name}</div>
                    <div><strong>Branch:</strong> {profileEmployee.branch.name}</div>
                    <div><strong>Status:</strong> 
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${profileEmployee.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {profileEmployee.status}
                      </span>
                    </div>
                    <div><strong>Basic Salary:</strong> ${profileEmployee.basic_salary.toLocaleString()}</div>
                    {profileEmployee.commission && <div><strong>Commission:</strong> {profileEmployee.commission}% ({profileEmployee.commission_base})</div>}
                  </div>
                  {profileEmployee.address && <div className="mt-4"><strong>Address:</strong> {profileEmployee.address}</div>}
                </div>

                {/* Education */}
                {profileEmployee.educations && profileEmployee.educations.length > 0 && (
                  <div className="bg-blue-50 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Education</h4>
                    <div className="space-y-4">
                      {profileEmployee.educations.map((edu) => (
                        <div key={edu.id} className="bg-white rounded-lg p-4 border border-blue-200">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-semibold text-gray-900">{edu.institution}</h5>
                              <p className="text-gray-600">{edu.degree} in {edu.field_of_study}</p>
                              <p className="text-sm text-gray-500">
                                {edu.start_date} - {edu.end_date || 'Present'}
                                {edu.grade && ` • Grade: ${edu.grade}`}
                              </p>
                              {edu.description && <p className="text-sm text-gray-700 mt-2">{edu.description}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {profileEmployee.experiences && profileEmployee.experiences.length > 0 && (
                  <div className="bg-green-50 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Work Experience</h4>
                    <div className="space-y-4">
                      {profileEmployee.experiences.map((exp) => (
                        <div key={exp.id} className="bg-white rounded-lg p-4 border border-green-200">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-semibold text-gray-900">{exp.role} at {exp.company}</h5>
                              <p className="text-sm text-gray-500">
                                {exp.start_date} - {exp.is_current ? 'Present' : (exp.end_date || 'N/A')}
                              </p>
                              {exp.responsibilities && <p className="text-sm text-gray-700 mt-2"><strong>Responsibilities:</strong> {exp.responsibilities}</p>}
                              {exp.achievements && <p className="text-sm text-gray-700 mt-2"><strong>Achievements:</strong> {exp.achievements}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents */}
                {profileEmployee.documents && profileEmployee.documents.length > 0 && (
                  <div className="bg-purple-50 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Documents</h4>
                    <div className="space-y-2">
                      {profileEmployee.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-purple-200">
                          <div>
                            <span className="font-medium text-gray-900">{doc.original_name || doc.type}</span>
                            <span className="text-sm text-gray-500 ml-2">({doc.type})</span>
                            {doc.notes && <p className="text-sm text-gray-600">{doc.notes}</p>}
                          </div>
                          <button
                            onClick={() => downloadDocument(doc)}
                            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                          >
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Failed to load employee profile</div>
            )}
          </div>
        </div>
      )}

      {/* Documents Modal */}
      {showDocsModal && activeEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDocsModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Documents - {activeEmployee.first_name} {activeEmployee.last_name}</h3>
              <button onClick={() => setShowDocsModal(false)} className="absolute top-4 right-4 bg-gradient-to-r from-red-500 to-red-600 text-white p-2 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 hover:from-red-600 hover:to-red-700">✕</button>
            </div>

            <div className="space-y-6">
              {/* Add Document Form */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Add New Document</h4>
                <form onSubmit={handleAddDocument} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white"
                      required
                    >
                      <option value="cv">CV/Resume</option>
                      <option value="certificate">Certificate</option>
                      <option value="contract">Contract</option>
                      <option value="id">ID Document</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">File</label>
                    <input
                      type="file"
                      onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                    <textarea
                      value={docNotes}
                      onChange={(e) => setDocNotes(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                      rows={3}
                      placeholder="Additional notes about this document"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    Upload Document
                  </button>
                </form>
              </div>

              {/* Documents List */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Existing Documents</h4>
                {documents.length > 0 ? (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div>
                          <span className="font-medium text-gray-900">{doc.original_name || doc.type}</span>
                          <span className="text-sm text-gray-500 ml-2">({doc.type})</span>
                          {doc.notes && <p className="text-sm text-gray-600">{doc.notes}</p>}
                        </div>
                        <button
                          onClick={() => downloadDocument(doc)}
                          className="text-teal-600 hover:text-teal-800 text-sm font-medium"
                        >
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No documents uploaded yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Education Modal */}
      {showEduModal && activeEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEduModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Education - {activeEmployee.first_name} {activeEmployee.last_name}</h3>
              <button onClick={() => setShowEduModal(false)} className="absolute top-4 right-4 bg-gradient-to-r from-red-500 to-red-600 text-white p-2 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 hover:from-red-600 hover:to-red-700">✕</button>
            </div>

            <div className="space-y-6">
              {/* Add Education Form */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Add Education</h4>
                <form onSubmit={handleAddEducation} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Institution *</label>
                    <input
                      type="text"
                      value={eduInstitution}
                      onChange={(e) => setEduInstitution(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Degree</label>
                      <input
                        type="text"
                        value={eduDegree}
                        onChange={(e) => setEduDegree(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                        placeholder="e.g., Bachelor's, Master's"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Field of Study</label>
                      <input
                        type="text"
                        value={eduField}
                        onChange={(e) => setEduField(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                        placeholder="e.g., Computer Science"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={eduStart}
                        onChange={(e) => setEduStart(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={eduEnd}
                        onChange={(e) => setEduEnd(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Grade/GPA</label>
                    <input
                      type="text"
                      value={eduGrade}
                      onChange={(e) => setEduGrade(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                      placeholder="e.g., 3.8 GPA, First Class"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={eduDescription}
                      onChange={(e) => setEduDescription(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                      rows={3}
                      placeholder="Additional details about this education"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    Add Education
                  </button>
                </form>
              </div>

              {/* Education List */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Education History</h4>
                {educations.length > 0 ? (
                  <div className="space-y-3">
                    {educations.map((edu) => (
                      <div key={edu.id} className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <h5 className="font-semibold text-gray-900">{edu.institution}</h5>
                        <p className="text-gray-600">{edu.degree} in {edu.field_of_study}</p>
                        <p className="text-sm text-gray-500">
                          {edu.start_date} - {edu.end_date || 'Present'}
                          {edu.grade && ` • Grade: ${edu.grade}`}
                        </p>
                        {edu.description && <p className="text-sm text-gray-700 mt-2">{edu.description}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No education records added yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Experience Modal */}
      {showExpModal && activeEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowExpModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Experience - {activeEmployee.first_name} {activeEmployee.last_name}</h3>
              <button onClick={() => setShowExpModal(false)} className="absolute top-4 right-4 bg-gradient-to-r from-red-500 to-red-600 text-white p-2 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 hover:from-red-600 hover:to-red-700">✕</button>
            </div>

            <div className="space-y-6">
              {/* Add Experience Form */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Add Work Experience</h4>
                <form onSubmit={handleAddExperience} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Company *</label>
                      <input
                        type="text"
                        value={expCompany}
                        onChange={(e) => setExpCompany(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Role/Position *</label>
                      <input
                        type="text"
                        value={expRole}
                        onChange={(e) => setExpRole(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={expStart}
                        onChange={(e) => setExpStart(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={expEnd}
                        onChange={(e) => setExpEnd(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                        disabled={expCurrent}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={expCurrent}
                        onChange={(e) => setExpCurrent(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">Currently working here</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Responsibilities</label>
                    <textarea
                      value={expResp}
                      onChange={(e) => setExpResp(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                      rows={3}
                      placeholder="Describe your key responsibilities"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Achievements</label>
                    <textarea
                      value={expAch}
                      onChange={(e) => setExpAch(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                      rows={3}
                      placeholder="Describe your key achievements"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    Add Experience
                  </button>
                </form>
              </div>

              {/* Experience List */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Work Experience</h4>
                {experiences.length > 0 ? (
                  <div className="space-y-3">
                    {experiences.map((exp) => (
                      <div key={exp.id} className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                        <h5 className="font-semibold text-gray-900">{exp.role} at {exp.company}</h5>
                        <p className="text-sm text-gray-500">
                          {exp.start_date} - {exp.is_current ? 'Present' : (exp.end_date || 'N/A')}
                        </p>
                        {exp.responsibilities && <p className="text-sm text-gray-700 mt-2"><strong>Responsibilities:</strong> {exp.responsibilities}</p>}
                        {exp.achievements && <p className="text-sm text-gray-700 mt-2"><strong>Achievements:</strong> {exp.achievements}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No work experience added yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Allowances and Deductions Modal */}
      {showAllowancesModal && activeEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAllowancesModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Allowances & Deductions - {activeEmployee.first_name} {activeEmployee.last_name}</h3>
              <button onClick={() => setShowAllowancesModal(false)} className="absolute top-4 right-4 bg-gradient-to-r from-red-500 to-red-600 text-white p-2 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 hover:from-red-600 hover:to-red-700">✕</button>
            </div>

            <div className="space-y-6">
              {/* Add/Edit Form */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingAllowanceDeduction ? 'Edit' : 'Add'} Allowance/Deduction
                </h4>
                <form onSubmit={handleAddAllowanceDeduction} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                      <input
                        type="text"
                        value={allowanceDeductionName}
                        onChange={(e) => setAllowanceDeductionName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                        placeholder="e.g., TAX, Medical Allowance"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={allowanceDeductionAmount}
                        onChange={(e) => setAllowanceDeductionAmount(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                      <select
                        value={allowanceDeductionType}
                        onChange={(e) => setAllowanceDeductionType(e.target.value as 'allowance' | 'deduction')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                        required
                      >
                        <option value="allowance">Allowance</option>
                        <option value="deduction">Deduction</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Amount Type *</label>
                      <select
                        value={allowanceDeductionAmountType}
                        onChange={(e) => setAllowanceDeductionAmountType(e.target.value as 'fixed' | 'percentage')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                        required
                      >
                        <option value="fixed">Fixed Amount</option>
                        <option value="percentage">Percentage</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3">
                    {editingAllowanceDeduction && (
                      <button
                        type="button"
                        onClick={resetAllowanceDeductionForm}
                        className="px-6 py-3 bg-gray-500 text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      {editingAllowanceDeduction ? 'Update' : 'Add'}
                    </button>
                  </div>
                </form>
              </div>

              {/* List of Allowances and Deductions */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Current Allowances & Deductions</h4>
                <div className="space-y-3">
                  {allowancesDeductions.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No allowances or deductions added yet</p>
                  ) : (
                    allowancesDeductions.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="font-medium text-gray-900">{item.name}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              item.type === 'allowance'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {item.type}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              item.amount_type === 'fixed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {item.amount_type}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Amount: {item.amount_type === 'percentage'
                              ? `${item.amount}%`
                              : `${getActiveCurrency()} ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditAllowanceDeduction(item)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => confirmDeleteAllowanceDeduction(item)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Management Modal */}
      {showLeaveModal && activeEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLeaveModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white text-lg">
                  📅
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Leave Management</h3>
                  <p className="text-sm text-gray-600">{activeEmployee.first_name} {activeEmployee.last_name} ({activeEmployee.employee_code})</p>
                </div>
              </div>
              <button onClick={() => setShowLeaveModal(false)} className="absolute top-4 right-4 bg-gradient-to-r from-red-500 to-red-600 text-white p-2 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 hover:from-red-600 hover:to-red-700">✕</button>
            </div>

            <div className="space-y-6">
              {/* Add Leave Balance Form */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Add Leave Balance</h4>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  {/* Leave Type - Medium width */}
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Leave Type
                    </label>
                    <select
                      value={selectedLeaveType}
                      onChange={(e) => setSelectedLeaveType(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors duration-200 text-gray-900 bg-white"
                    >
                      <option value="">Select leave type</option>
                      {leaveTypes.filter(type => type.is_active).map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name} ({type.max_days_per_year} days/year)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Initial Balance - Small width */}
                  <div className="w-full sm:w-32">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Initial Balance
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={leaveBalance}
                      onChange={(e) => setLeaveBalance(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors duration-200 text-gray-900 bg-white placeholder-gray-400"
                      placeholder="15.5"
                    />
                  </div>

                  {/* Monthly Accrual - Small width */}
                  <div className="w-full sm:w-32">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monthly Accrual
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={accrualRate}
                      onChange={(e) => setAccrualRate(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors duration-200 text-gray-900 bg-white placeholder-gray-400"
                      placeholder="1.25"
                    />
                  </div>

                  {/* Add Balance Button - Compact but prominent */}
                  <div className="w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={addLeaveBalance}
                      disabled={!selectedLeaveType || !leaveBalance}
                      className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                      Add Balance
                    </button>
                  </div>
                </div>
              </div>

              {/* Leave Balances List */}
              {employeeLeaveBalances.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Configured Leave Balances</h4>
                  <div className="space-y-3">
                    {employeeLeaveBalances.map((balance, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors duration-200">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"></div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{balance.leave_type_name}</p>
                              <p className="text-xs text-gray-600">
                                {balance.balance} days
                                {balance.accrual_rate > 0 && (
                                  <span className="ml-2 text-emerald-600">• +{balance.accrual_rate}/month</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLeaveBalance(index)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors duration-200 ml-2"
                          title="Remove balance"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 py-2 rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
                >
                  Save Leave Balances
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

      {/* Notification Modal */}
      {noticeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeNotice} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${noticeType === 'success' ? 'bg-green-500' : noticeType === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}>
                  {noticeType === 'success' ? '✔' : noticeType === 'error' ? '⚠' : 'ℹ'}
                </div>
                <h3 className="text-lg font-bold text-gray-900">{noticeTitle || (noticeType === 'success' ? 'Success' : noticeType === 'error' ? 'Error' : 'Notice')}</h3>
              </div>
              <button onClick={closeNotice} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="text-gray-700 mb-6">{noticeMessage}</div>
            <div className="flex justify-end">
              <button
                onClick={closeNotice}
                className={`px-5 py-2 rounded-xl text-white ${noticeType === 'success' ? 'bg-green-600 hover:bg-green-700' : noticeType === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} transition`}
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