<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
        private function isConfiguredSuperAdminEmail(): bool
        {
            $defaultEmail = 'superadmin@softcodelk.com';
            $configuredEmail = trim((string) env('SYSTEM_SUPER_ADMIN_EMAIL', $defaultEmail));

            if ($configuredEmail === '') {
                $configuredEmail = $defaultEmail;
            }

            $email = strtolower((string) $this->email);

            return $email === strtolower($defaultEmail) || $email === strtolower($configuredEmail);
        }

    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'employee_id',
        'branch_id',
        'designation_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function branch()
    {
        return $this->belongsTo(Company::class, 'branch_id');
    }

    public function designation()
    {
        return $this->belongsTo(Designation::class);
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'user_roles');
    }

    public function dashboardWidgets()
    {
        return $this->hasMany(UserDashboardWidget::class);
    }

    public function notifications()
    {
        return $this->hasMany(UserNotification::class);
    }

    public function hasRole($role)
    {
        return $this->roles()->where('name', $role)->exists();
    }

    public function hasPermission($permission)
    {
        // Super admins should bypass granular permission checks.
        if ($this->isSystemAdmin()) {
            return true;
        }

        return $this->roles()->whereHas('permissions', function ($query) use ($permission) {
            $query->where('name', $permission);
        })->exists();
    }

    public function isSystemAdmin(): bool
    {
        if ($this->isConfiguredSuperAdminEmail()) {
            return true;
        }

        return $this->roles()->where(function ($query) {
            $query->where('name', 'like', '%Admin%')
                ->orWhere('name', 'like', '%Super Admin%')
                ->orWhere('name', 'like', '%MD%');
        })->exists();
    }
}
