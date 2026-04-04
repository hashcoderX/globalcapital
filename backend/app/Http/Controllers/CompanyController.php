<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\Employee;
use App\Models\Candidate;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;
use Throwable;
use ZipArchive;

class CompanyController extends Controller
{
        private function isSystemOnline(): bool
        {
            if (!Schema::hasTable('system_settings')) {
                return true;
            }

            $value = DB::table('system_settings')->where('key', 'system_online')->value('value');
            return (string) ($value ?? '1') === '1';
        }

        private function setSystemOnlineValue(bool $isOnline): void
        {
            DB::table('system_settings')->updateOrInsert(
                ['key' => 'system_online'],
                [
                    'value' => $isOnline ? '1' : '0',
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }

        public function getSystemStatus(Request $request)
        {
            $user = $request->user();
            if (!$user || !$user->isSystemAdmin()) {
                return response()->json([
                    'message' => 'Only admins can view system status.'
                ], 403);
            }

            return response()->json([
                'is_online' => $this->isSystemOnline(),
            ]);
        }

        public function updateSystemStatus(Request $request)
        {
            $user = $request->user();
            if (!$user || !$user->isSystemAdmin()) {
                return response()->json([
                    'message' => 'Only admins can change system status.'
                ], 403);
            }

            $validated = $request->validate([
                'is_online' => 'required|boolean',
            ]);

            $isOnline = (bool) $validated['is_online'];
            $this->setSystemOnlineValue($isOnline);

            return response()->json([
                'message' => $isOnline ? 'System is now online.' : 'System is now offline for non-admin users.',
                'is_online' => $isOnline,
            ]);
        }

    private const DEFAULT_SUPER_ADMIN_EMAIL = 'superadmin@softcodelk.com';

    public function index()
    {
        $companies = Company::all();
        return response()->json($companies);
    }

    public function show(Company $company)
    {
        return response()->json($company);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:companies',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'website' => 'nullable|url',
            'country' => 'nullable|string|max:100',
            'currency' => 'nullable|string|max:10',
        ]);

        $company = Company::create($request->all());

        return response()->json($company, 201);
    }

    public function update(Request $request, Company $company)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:companies,email,' . $company->id,
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'website' => 'nullable|url',
            'country' => 'nullable|string|max:100',
            'currency' => 'nullable|string|max:10',
        ]);

        $company->update($request->all());

        return response()->json($company);
    }

    public function destroy(Company $company)
    {
        // Check if company is referenced in other tables
        $hasEmployees = Employee::where('tenant_id', $company->id)->orWhere('branch_id', $company->id)->exists();
        $hasCandidates = Candidate::where('tenant_id', $company->id)->orWhere('branch_id', $company->id)->exists();
        $hasDepartments = Department::where('tenant_id', $company->id)->orWhere('branch_id', $company->id)->exists();
        $hasDesignations = Designation::where('tenant_id', $company->id)->orWhere('branch_id', $company->id)->exists();

        if ($hasEmployees || $hasCandidates || $hasDepartments || $hasDesignations) {
            return response()->json(['error' => 'Cannot delete company because it is referenced by other records.'], 422);
        }

        $company->delete();
        return response()->json(['message' => 'Company deleted successfully']);
    }

    public function backup(Company $company)
    {
        $company->load(['documentTemplates']);

        $tempBase = tempnam(sys_get_temp_dir(), 'company_backup_');
        $zipPath = $tempBase . '.zip';
        @unlink($tempBase);

        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            return response()->json(['message' => 'Failed to create backup archive.'], 500);
        }

        $companyPayload = [
            'id' => $company->id,
            'name' => $company->name,
            'email' => $company->email,
            'address' => $company->address,
            'phone' => $company->phone,
            'website' => $company->website,
            'country' => $company->country,
            'currency' => $company->currency,
            'created_at' => $company->created_at,
            'updated_at' => $company->updated_at,
        ];

        $templatesPayload = [];

        foreach ($company->documentTemplates as $template) {
            $templatesPayload[] = [
                'id' => $template->id,
                'template_type' => $template->template_type,
                'file_path' => $template->file_path,
                'original_name' => $template->original_name,
                'is_active' => (bool) $template->is_active,
                'uploaded_by' => $template->uploaded_by,
                'created_at' => $template->created_at,
                'updated_at' => $template->updated_at,
            ];

            if (!Storage::disk('public')->exists($template->file_path)) {
                continue;
            }

            $absolutePath = Storage::disk('public')->path($template->file_path);
            $safeFileName = preg_replace('/[^a-zA-Z0-9_\-.]/', '_', (string) $template->original_name);
            $safeFileName = trim((string) $safeFileName) !== '' ? $safeFileName : basename((string) $template->file_path);
            $zipInternalPath = 'templates/' . $template->template_type . '/' . $template->id . '_' . $safeFileName;

            $zip->addFile($absolutePath, $zipInternalPath);
        }

        $manifest = [
            'backup_type' => 'company_backup',
            'generated_at' => now()->toIso8601String(),
            'company' => $companyPayload,
            'document_templates' => $templatesPayload,
        ];

        $zip->addFromString('backup_manifest.json', json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        $zip->close();

        $downloadName = 'company_backup_' . $company->id . '_' . date('Ymd_His') . '.zip';

        return response()->download($zipPath, $downloadName)->deleteFileAfterSend(true);
    }

    private function resolveMysqldumpBinary(): ?string
    {
        $finder = new ExecutableFinder();

        $configured = trim((string) env('DB_DUMP_BINARY', ''));
        if ($configured !== '') {
            if (file_exists($configured)) {
                return $configured;
            }

            $foundConfigured = $finder->find($configured);
            if ($foundConfigured !== null) {
                return $foundConfigured;
            }
        }

        $candidates = [
            'C:\\xampp\\mysql\\bin\\mysqldump.exe',
            'C:\\xampp\\mariadb\\bin\\mysqldump.exe',
            'C:\\Program Files\\MariaDB 10.4\\bin\\mysqldump.exe',
            'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe',
            'mysqldump.exe',
            'mysqldump',
        ];

        foreach ($candidates as $candidate) {
            if (file_exists($candidate)) {
                return $candidate;
            }

            $found = $finder->find($candidate);
            if ($found !== null) {
                return $found;
            }
        }

        return null;
    }

    private function buildSqlValue(mixed $value, \PDO $pdo): string
    {
        if ($value === null) {
            return 'NULL';
        }

        if (is_bool($value)) {
            return $value ? '1' : '0';
        }

        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }

        return $pdo->quote((string) $value);
    }

    private function buildSqlBackupFromConnection(string $connectionName): string
    {
        $connection = DB::connection($connectionName);
        $pdo = $connection->getPdo();
        $databaseName = (string) $connection->getDatabaseName();

        $sql = [];
        $sql[] = '-- BMS SQL Backup';
        $sql[] = '-- Generated at: ' . now()->toDateTimeString();
        $sql[] = '-- Database: ' . $databaseName;
        $sql[] = 'SET FOREIGN_KEY_CHECKS=0;';
        $sql[] = 'SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";';
        $sql[] = 'START TRANSACTION;';
        $sql[] = '';

        $tableRows = $connection->select('SHOW TABLES');

        foreach ($tableRows as $tableRow) {
            $tableValues = array_values((array) $tableRow);
            $tableName = (string) ($tableValues[0] ?? '');

            if ($tableName === '') {
                continue;
            }

            $escapedTable = str_replace('`', '``', $tableName);

            $createRows = $connection->select('SHOW CREATE TABLE `' . $escapedTable . '`');
            if (empty($createRows)) {
                continue;
            }

            $createValues = array_values((array) $createRows[0]);
            $createStatement = (string) ($createValues[1] ?? '');

            if ($createStatement === '') {
                continue;
            }

            $sql[] = '--';
            $sql[] = '-- Table structure for table `' . $escapedTable . '`';
            $sql[] = '--';
            $sql[] = 'DROP TABLE IF EXISTS `' . $escapedTable . '`;';
            $sql[] = $createStatement . ';';
            $sql[] = '';

            $columns = $connection->getSchemaBuilder()->getColumnListing($tableName);
            if (empty($columns)) {
                continue;
            }

            $columnList = array_map(function (string $column): string {
                return '`' . str_replace('`', '``', $column) . '`';
            }, $columns);

            foreach ($connection->table($tableName)->orderBy($columns[0])->cursor() as $row) {
                $rowArray = (array) $row;
                $valueList = [];

                foreach ($columns as $column) {
                    $valueList[] = $this->buildSqlValue($rowArray[$column] ?? null, $pdo);
                }

                $sql[] = 'INSERT INTO `' . $escapedTable . '` (' . implode(', ', $columnList) . ') VALUES (' . implode(', ', $valueList) . ');';
            }

            $sql[] = '';
        }

        $sql[] = 'COMMIT;';
        $sql[] = 'SET FOREIGN_KEY_CHECKS=1;';
        $sql[] = '';

        return implode(PHP_EOL, $sql);
    }

    public function databaseBackup(Company $company)
    {
        $defaultConnection = config('database.default');
        $connection = config('database.connections.' . $defaultConnection);

        if (!is_array($connection) || ($connection['driver'] ?? null) !== 'mysql') {
            return response()->json([
                'message' => 'Database backup currently supports only MySQL connections.'
            ], 422);
        }

        $host = (string) ($connection['host'] ?? '127.0.0.1');
        $port = (string) ($connection['port'] ?? '3306');
        $database = (string) ($connection['database'] ?? '');
        $username = (string) ($connection['username'] ?? '');
        $password = (string) ($connection['password'] ?? '');

        if ($database === '' || $username === '') {
            return response()->json([
                'message' => 'Database credentials are incomplete for backup.'
            ], 500);
        }

        $sqlDump = '';
        $binary = $this->resolveMysqldumpBinary();

        if ($binary !== null) {
            $command = [
                $binary,
                "--host={$host}",
                "--port={$port}",
                "--user={$username}",
                "--password={$password}",
                '--single-transaction',
                '--quick',
                '--routines',
                '--triggers',
                '--events',
                '--no-tablespaces',
                $database,
            ];

            try {
                $process = new Process($command);
                $process->setTimeout(300);
                $process->run();

                if ($process->isSuccessful()) {
                    $sqlDump = $process->getOutput();
                } else {
                    Log::warning('mysqldump failed, using PHP fallback backup builder', [
                        'stderr' => trim($process->getErrorOutput()),
                        'binary' => $binary,
                    ]);
                }
            } catch (Throwable $exception) {
                Log::warning('mysqldump execution threw exception, using PHP fallback backup builder', [
                    'error' => $exception->getMessage(),
                    'binary' => $binary,
                ]);
            }
        }

        if (trim($sqlDump) === '') {
            try {
                $sqlDump = $this->buildSqlBackupFromConnection((string) $defaultConnection);
            } catch (Throwable $exception) {
                return response()->json([
                    'message' => 'Database backup failed. ' . $exception->getMessage()
                ], 500);
            }
        }

        if (trim($sqlDump) === '') {
            return response()->json([
                'message' => 'Database backup output is empty.'
            ], 500);
        }

        $tempBase = tempnam(sys_get_temp_dir(), 'db_backup_');
        $sqlPath = $tempBase . '.sql';
        @unlink($tempBase);
        file_put_contents($sqlPath, $sqlDump);

        $downloadName = 'database_backup_' . $company->id . '_' . date('Ymd_His') . '.sql';

        return response()->download($sqlPath, $downloadName)->deleteFileAfterSend(true);
    }

    private function clearPublicStorageData(): void
    {
        $disk = Storage::disk('public');

        foreach ($disk->allFiles() as $file) {
            if (basename($file) === '.gitignore') {
                continue;
            }

            $disk->delete($file);
        }

        $directories = $disk->allDirectories();
        usort($directories, static function (string $a, string $b): int {
            return strlen($b) <=> strlen($a);
        });

        foreach ($directories as $directory) {
            $disk->deleteDirectory($directory);
        }
    }

    public function resetSystem(Request $request)
    {
        $requestUser = $request->user();
        if (!$requestUser || $requestUser->email !== self::DEFAULT_SUPER_ADMIN_EMAIL) {
            return response()->json([
                'message' => 'Only the Super Admin can reset the system.'
            ], 403);
        }

        $superAdminEmail = trim((string) env('SYSTEM_SUPER_ADMIN_EMAIL', self::DEFAULT_SUPER_ADMIN_EMAIL));
        if ($superAdminEmail === '') {
            $superAdminEmail = self::DEFAULT_SUPER_ADMIN_EMAIL;
        }

        $generatedPassword = Str::password(14);

        try {
            @set_time_limit(0);

            $this->clearPublicStorageData();

            Artisan::call('migrate:fresh', ['--force' => true]);
            Artisan::call('db:seed', ['--force' => true]);

            $superAdmin = User::firstOrCreate(
                ['email' => $superAdminEmail],
                [
                    'name' => 'Super Admin',
                    'password' => Hash::make($generatedPassword),
                ]
            );

            $superAdmin->name = 'Super Admin';
            $superAdmin->password = Hash::make($generatedPassword);
            $superAdmin->employee_id = null;
            $superAdmin->branch_id = null;
            $superAdmin->designation_id = null;
            $superAdmin->save();

            $superAdminRole = Role::firstOrCreate(
                ['name' => 'Super Admin'],
                ['description' => 'Full system access with all permissions']
            );

            $superAdmin->roles()->sync([
                $superAdminRole->id => [
                    'assigned_at' => now(),
                    'assigned_by' => $superAdmin->id,
                ],
            ]);

            $this->setSystemOnlineValue(true);

            DB::table('personal_access_tokens')->truncate();

            return response()->json([
                'message' => 'System reset completed successfully.',
                'super_admin' => [
                    'email' => $superAdminEmail,
                    'password' => $generatedPassword,
                ],
            ]);
        } catch (Throwable $exception) {
            Log::error('System reset failed', [
                'error' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => 'System reset failed. ' . $exception->getMessage(),
            ], 500);
        }
    }
}
