import React, { useState } from 'react';
import {
  User,
  UserRole,
  ROLE_PERMISSIONS,
  loadAllAccounts,
  registerNewAccount
} from '../types/auth';
import {
  ShieldCheck,
  Eye,
  Lock,
  ArrowRight,
  AlertCircle,
  User as UserIcon,
  EyeOff,
  Mail,
  Building2,
  UserPlus,
  LogIn,
  Share2,
  MonitorDown
} from 'lucide-react';
import { ShareAndInstallModal } from './ShareAndInstallModal';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login State (no prefilled demo credentials)
  const [selectedRole, setSelectedRole] = useState<UserRole>('SMT');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Register State
  const [regFullName, setRegFullName] = useState<string>('');
  const [regUsername, setRegUsername] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regDepartment, setRegDepartment] = useState<string>('');
  const [regRole, setRegRole] = useState<UserRole>('SMT');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);

  const handleUsernameChange = (val: string) => {
    setUsername(val);
    setError(null);
    const cleaned = val.trim().toLowerCase();
    const matched = loadAllAccounts().find(
      entry => entry.username.toLowerCase() === cleaned
    );
    if (matched) {
      setSelectedRole(matched.user.role);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError('Please enter your username.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    const allAccounts = loadAllAccounts();
    const matched = allAccounts.find(
      entry => entry.username.toLowerCase() === cleanUsername.toLowerCase()
    );

    if (matched) {
      if (matched.user.role !== selectedRole) {
        setError(
          `Username "${matched.username}" is registered under ${ROLE_PERMISSIONS[matched.user.role].label}. Select the matching role.`
        );
        return;
      }
      if (matched.defaultPassword !== password) {
        setError('Incorrect password for this account.');
        return;
      }
      onLogin(matched.user);
      return;
    }

    // Standard DKT staff sign-in with chosen role
    const displayName = cleanUsername
      .split(/[._-]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    onLogin({
      id: `usr-${Date.now()}`,
      username: cleanUsername,
      name: displayName || cleanUsername,
      email: `${cleanUsername.toLowerCase()}@dktethiopia.org`,
      role: selectedRole,
      title:
        selectedRole === 'SMT'
          ? 'Senior Management Team Member'
          : 'Inbound Logistics Officer',
      department:
        selectedRole === 'SMT' ? 'Executive Leadership' : 'Supply Chain & Procurement'
    });
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const result = registerNewAccount({
      fullName: regFullName,
      username: regUsername,
      email: regEmail,
      department: regDepartment,
      role: regRole,
      password: regPassword
    });

    if (result.ok === false) {
      setError(result.error);
      return;
    }

    onLogin(result.user);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0e1b2c] via-[#162742] to-[#3b121c] flex flex-col justify-center items-center px-4 py-6">
      <div className="w-full max-w-[430px] bg-white rounded-2xl border-t-4 border-t-red-600 border border-slate-700/30 shadow-2xl overflow-hidden">
        {/* Compact Brand Header */}
        <div className="px-6 pt-5 pb-4 bg-gradient-to-r from-red-50/70 via-white to-blue-50/40 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/assets/aistudio/Eniyew_Sig_406801b8.png"
              alt="DKT Ethiopia"
              className="h-9 w-auto object-contain shrink-0"
            />
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 leading-tight truncate">
                DKT Ethiopia
              </div>
              <div className="text-[11px] font-medium text-slate-500 truncate">
                Inbound Supply Portal
              </div>
            </div>
          </div>

          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError(null);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                authMode === 'login'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setError(null);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                authMode === 'register'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
          </div>
        </div>

        {/* Compact Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-username"
                  className="text-xs font-bold text-slate-700 block mb-1"
                >
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={e => handleUsernameChange(e.target.value)}
                    autoComplete="username"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white transition-colors"
                    placeholder="Enter username"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="text-xs font-bold text-slate-700 block mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    autoComplete="current-password"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white transition-colors"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Role Access
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('SMT');
                      setError(null);
                    }}
                    className={`text-left p-2.5 rounded-xl border transition-all flex items-center gap-2 ${
                      selectedRole === 'SMT'
                        ? 'border-red-600 bg-red-50/70 ring-1 ring-red-600/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <Eye
                      className={`w-4 h-4 shrink-0 ${
                        selectedRole === 'SMT' ? 'text-red-600' : 'text-slate-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">SMT</div>
                      <div className="text-[10px] text-slate-500 truncate">View Only</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('INBOUND_LOGISTICS');
                      setError(null);
                    }}
                    className={`text-left p-2.5 rounded-xl border transition-all flex items-center gap-2 ${
                      selectedRole === 'INBOUND_LOGISTICS'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <ShieldCheck
                      className={`w-4 h-4 shrink-0 ${
                        selectedRole === 'INBOUND_LOGISTICS'
                          ? 'text-emerald-600'
                          : 'text-slate-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">Logistics</div>
                      <div className="text-[10px] text-slate-500 truncate">Full Access</div>
                    </div>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="reg-fullname"
                    className="text-xs font-bold text-slate-700 block mb-1"
                  >
                    Full Name
                  </label>
                  <input
                    id="reg-fullname"
                    type="text"
                    value={regFullName}
                    onChange={e => setRegFullName(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                    placeholder="Dawit Bekele"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-username"
                    className="text-xs font-bold text-slate-700 block mb-1"
                  >
                    Username
                  </label>
                  <input
                    id="reg-username"
                    type="text"
                    value={regUsername}
                    onChange={e => setRegUsername(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-red-600 focus:bg-white"
                    placeholder="dawit.b"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="reg-email"
                    className="text-xs font-bold text-slate-700 block mb-1"
                  >
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="reg-email"
                      type="email"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                      placeholder="name@dktethiopia.org"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-dept"
                    className="text-xs font-bold text-slate-700 block mb-1"
                  >
                    Department
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="reg-dept"
                      type="text"
                      value={regDepartment}
                      onChange={e => setRegDepartment(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                      placeholder={regRole === 'SMT' ? 'Executive' : 'Supply Chain'}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Role Access
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRegRole('SMT')}
                    className={`text-left p-2 rounded-xl border transition-all flex items-center gap-2 ${
                      regRole === 'SMT'
                        ? 'border-red-600 bg-red-50/70'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <Eye
                      className={`w-3.5 h-3.5 shrink-0 ${
                        regRole === 'SMT' ? 'text-red-600' : 'text-slate-500'
                      }`}
                    />
                    <span className="text-xs font-bold text-slate-900">SMT (Read Only)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('INBOUND_LOGISTICS')}
                    className={`text-left p-2 rounded-xl border transition-all flex items-center gap-2 ${
                      regRole === 'INBOUND_LOGISTICS'
                        ? 'border-emerald-600 bg-emerald-50/70'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <ShieldCheck
                      className={`w-3.5 h-3.5 shrink-0 ${
                        regRole === 'INBOUND_LOGISTICS'
                          ? 'text-emerald-600'
                          : 'text-slate-500'
                      }`}
                    />
                    <span className="text-xs font-bold text-slate-900">Logistics (Full)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="reg-password"
                    className="text-xs font-bold text-slate-700 block mb-1"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 pr-8 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                      placeholder="Min 6 chars"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(prev => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                      aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-confirm"
                    className="text-xs font-bold text-slate-700 block mb-1"
                  >
                    Confirm
                  </label>
                  <input
                    id="reg-confirm"
                    type={showRegPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={e => setRegConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                    placeholder="Repeat password"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </button>
            </form>
          )}

          {/* Share App Link & Desktop Shortcut Strip */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsShareOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-blue-300 text-xs font-semibold text-slate-700 hover:text-blue-700 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Share App Link &amp; Desktop Shortcut</span>
              <MonitorDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>
          </div>
        </div>
      </div>

      <ShareAndInstallModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />
    </div>
  );
};
