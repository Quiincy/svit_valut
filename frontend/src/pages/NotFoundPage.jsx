import { Link } from 'react-router-dom';
import { Home, ArrowRight } from 'lucide-react';

export default function NotFoundPage() {
    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="max-w-xl w-full text-center relative z-10">
                {/* Glowing background effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-accent-yellow/20 rounded-full blur-[100px] -z-10" />

                <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-accent-yellow to-yellow-600 mb-6 drop-shadow-lg">
                    404
                </h1>

                <h2 className="text-3xl font-bold mb-4 text-white">
                    Сторінку не знайдено
                </h2>

                <p className="text-text-secondary text-lg mb-10 max-w-md mx-auto leading-relaxed">
                    Можливо, вона була видалена, перейменована або тимчасово недоступна. Поверніться на головну, щоб продовжити.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        to="/"
                        className="flex items-center gap-2 px-8 py-4 bg-accent-yellow text-primary rounded-xl font-bold text-lg hover:bg-yellow-400 hover:shadow-lg hover:shadow-yellow-500/20 transition-all transform hover:-translate-y-1 w-full sm:w-auto justify-center"
                    >
                        <Home className="w-5 h-5" />
                        На головну
                    </Link>

                    <Link
                        to="/contacts"
                        className="flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-medium text-lg hover:bg-white/10 transition-colors w-full sm:w-auto justify-center"
                    >
                        Контакти
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
