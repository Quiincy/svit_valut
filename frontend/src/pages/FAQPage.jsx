import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ChevronDown, HelpCircle } from 'lucide-react';

export default function FAQPage() {
    const { faqItems } = useOutletContext();
    const [openItem, setOpenItem] = useState(null);

    const toggleItem = (id) => {
        setOpenItem(openItem === id ? null : id);
    };

    const defaultFaq = [
        { id: 1, question: 'Які документи потрібні для обміну валют?', answer: 'Для обміну суми до 50 000 грн — лише паспорт або ID-карта. Для більших сум може знадобитися довідка про доходи.' },
        { id: 2, question: 'Яким чином відбувається бронювання курсу?', answer: 'Ви можете забронювати курс через наш онлайн-чат або за телефоном. Курс фіксується на 30 хвилин.' },
        { id: 3, question: 'Чи можна обміняти зношені або пошкоджені купюри?', answer: 'Так, ми приймаємо зношену та пошкоджену валюту. Умови обміну залежать від стану купюр.' },
        { id: 4, question: 'Які валюти доступні для обміну?', answer: 'Ми працюємо з усіма основними валютами: USD, EUR, GBP, CHF, PLN та ін. Повний перелік на головній сторінці.' },
        { id: 5, question: 'Скільки відділень працює в Києві?', answer: 'Наразі працює декілька відділень по Києву. Адреси та графік роботи доступні на сторінці Контакти.' },
    ];

    const items = faqItems?.length > 0 ? faqItems : defaultFaq;

    return (
        <div className="min-h-screen bg-primary pt-28 pb-16">
            <div className="max-w-3xl mx-auto px-4 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="w-16 h-16 bg-accent-yellow/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <HelpCircle className="w-8 h-8 text-accent-yellow" />
                    </div>
                    <h1 className="text-3xl lg:text-5xl font-bold text-white mb-4">Часті запитання</h1>
                    <p className="text-text-secondary text-lg max-w-xl mx-auto">
                        Відповіді на популярні запитання про обмін валют у «Світ Валют».
                    </p>
                </div>

                {/* FAQ Accordion */}
                <div className="space-y-3">
                    {items.map((item) => {
                        const isOpen = openItem === item.id;
                        return (
                            <div
                                key={item.id}
                                className={`bg-primary-light border rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'border-accent-yellow/30' : 'border-white/10 hover:border-white/20'}`}
                            >
                                <button
                                    onClick={() => toggleItem(item.id)}
                                    className="w-full text-left px-6 py-5 flex items-center justify-between gap-4"
                                >
                                    <span className="text-white font-semibold text-base lg:text-lg pr-4">
                                        {item.question}
                                    </span>
                                    <ChevronDown
                                        className={`w-5 h-5 text-accent-yellow shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                <div
                                    className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                                >
                                    <div className="px-6 pb-5 text-text-secondary leading-relaxed">
                                        {item.answer}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* CTA */}
                <div className="mt-12 text-center bg-primary-light border border-white/10 rounded-2xl p-8">
                    <h3 className="text-xl font-bold text-white mb-2">Не знайшли відповідь?</h3>
                    <p className="text-text-secondary mb-6">Напишіть нам у чат — відповімо за кілька хвилин.</p>
                    <a
                        href="/#"
                        className="inline-block px-8 py-3 bg-accent-yellow rounded-full text-primary font-bold hover:bg-yellow-400 transition-colors"
                    >
                        Зв'язатися з нами
                    </a>
                </div>
            </div>
        </div>
    );
}
