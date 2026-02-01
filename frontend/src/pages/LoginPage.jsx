import { useState } from 'react';
import { Lock, User, AlertCircle } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onLogin(username, password);
    } catch (err) {
      setError('Невірний логін або пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-accent-yellow rounded-xl flex items-center justify-center font-extrabold text-primary text-xl">
              $
            </div>
            <div className="text-left">
              <div className="font-bold text-2xl">СВІТ</div>
              <div className="text-xs font-medium text-text-secondary tracking-[3px] uppercase">ВАЛЮТ</div>
            </div>
          </div>
          <p className="text-text-secondary">Панель управління</p>
        </div>

        {/* Login Form */}
        <div className="bg-primary-card backdrop-blur-xl rounded-3xl p-8 border border-white/10">
          <h2 className="text-xl font-bold mb-6 text-center">Вхід в систему</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-2">Логін</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Введіть логін"
                  className="w-full pl-12 pr-4 py-4 bg-primary-light rounded-xl border border-white/10 text-white placeholder:text-text-secondary focus:border-accent-yellow focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-2">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введіть пароль"
                  className="w-full pl-12 pr-4 py-4 bg-primary-light rounded-xl border border-white/10 text-white placeholder:text-text-secondary focus:border-accent-yellow focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-gold rounded-xl text-primary font-bold text-base uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? 'Вхід...' : 'Увійти'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-text-secondary text-center mb-3">Тестові облікові записи:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-primary-light rounded-lg">
                <div className="text-accent-yellow font-medium">Адмін</div>
                <div className="text-text-secondary">admin / admin123</div>
              </div>
              <div className="p-2 bg-primary-light rounded-lg">
                <div className="text-accent-blue font-medium">Оператор</div>
                <div className="text-text-secondary">operator1 / op1pass</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
