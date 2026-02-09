import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, HelpCircle } from 'lucide-react';

const defaultFaqs = [
  { id: 1, question: "Як захиститися від фальшивих купюр", answer: "Ми використовуємо професійне обладнання для перевірки справжності банкнот." },
  { id: 2, question: "Як правильно розрахувати курс USD → EUR?", answer: 'Це питання детально розібрано в статті "Що таке конвертація валюти та як вірно рахувати".', link_text: "Детальніше", link_url: "/articles/1" },
  { id: 3, question: "Як працює міжбанк і чому курс змінюється", answer: "Міжбанківський курс формується на основі попиту та пропозиції на валютному ринку між банками." },
  { id: 4, question: "Коли діє оптовий курс?", answer: "Оптовий курс діє при обміні від 1000 USD або еквівалент в іншій валюті." },
  { id: 5, question: "Які банкноти вважаються зношеними?", answer: "Зношеними вважаються банкноти з пошкодженнями: надриви, плями, написи, відсутні фрагменти." },
];

export default function FAQSection({ faqItems }) {
  const [expandedIndex, setExpandedIndex] = useState(1);

  const items = faqItems?.length > 0 ? faqItems : defaultFaqs;

  return (
    <section id="faq" className="py-12 lg:py-20 px-4 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl lg:text-4xl font-bold mb-8">Часті запитання та статті</h2>

        <div className="space-y-3">
          {items.map((faq, index) => (
            <div
              key={faq.id}
              className={`bg-primary-light rounded-xl border transition-all ${expandedIndex === index
                  ? 'border-accent-blue'
                  : 'border-white/10'
                }`}
            >
              <button
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                className="w-full p-4 lg:p-5 flex items-center gap-4 text-left"
              >
                <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="w-5 h-5 text-accent-blue" />
                </div>
                <span className="flex-1 font-medium">{faq.question}</span>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${expandedIndex === index
                    ? 'bg-accent-blue text-white rotate-180'
                    : 'bg-white/5 text-text-secondary'
                  }`}>
                  <ChevronDown className="w-5 h-5" />
                </div>
              </button>

              {expandedIndex === index && (
                <div className="px-4 lg:px-5 pb-4 lg:pb-5 pl-[72px]">
                  <p className="text-text-secondary mb-3">{faq.answer}</p>
                  {faq.link_text && faq.link_url && (
                    <Link
                      to={faq.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 border border-accent-blue text-accent-blue rounded-lg text-sm font-medium hover:bg-accent-blue/10 transition-colors inline-block"
                    >
                      {faq.link_text}
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
