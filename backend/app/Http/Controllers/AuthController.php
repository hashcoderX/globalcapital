<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private function isSystemOnline(): bool
    {
        if (!Schema::hasTable('system_settings')) {
            return true;
        }

        $value = DB::table('system_settings')->where('key', 'system_online')->value('value');
        return (string) ($value ?? '1') === '1';
    }

    private function loadAuthUser(User $user): User
    {
        return $user->load([
            'branch:id,name',
            'designation:id,name',
            'employee:id,first_name,last_name,email,branch_id,designation_id',
            'roles:id,name,description',
            'roles.permissions:id,name,module,description',
        ]);
    }

    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = $user->createToken('API Token')->plainTextToken;

        return response()->json([
            'user' => $this->loadAuthUser($user),
            'token' => $token,
        ]);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user = User::query()->findOrFail((int)Auth::id());

        if (!$this->isSystemOnline() && !$user->isSystemAdmin()) {
            Auth::logout();
            throw ValidationException::withMessages([
                'email' => ['System is currently offline. Only admins can log in at this time.'],
            ]);
        }

        $token = $user->createToken('API Token')->plainTextToken;

        return response()->json([
            'user' => $this->loadAuthUser($user),
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function forgotPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $email = strtolower(trim((string) $validated['email']));
        $user = User::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'email' => ['No account found for this email address.'],
            ]);
        }

        $user->password = Hash::make((string) $validated['password']);
        $user->save();

        DB::table('personal_access_tokens')
            ->where('tokenable_type', User::class)
            ->where('tokenable_id', (int) $user->id)
            ->delete();

        return response()->json([
            'message' => 'Password reset successful. You can now sign in with your new password.',
        ]);
    }
}
