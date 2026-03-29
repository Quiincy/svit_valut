import { useEffect } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Shield } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const { settings, seoList } = useOutletContext();
  const location = useLocation();

  const companyName = settings?.company_name || 'Світ Валют';
  const siteUrl = 'https://mirvalut.com';
  const email = settings?.email || 'info@mirvalut.com';

  // Check for custom SEO
  const pathname = decodeURIComponent(location.pathname);
  const cleanPathname = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  const reqPath = cleanPathname.toLowerCase();
  const activeSeo = (seoList || []).find(s => {
    if (!s.url_path) return false;
    let dbPath = s.url_path.toLowerCase();
    if (!dbPath.startsWith('/')) dbPath = '/' + dbPath;
    if (dbPath.endsWith('/') && dbPath.length > 1) dbPath = dbPath.slice(0, -1);
    return dbPath === reqPath;
  });

  const pageTitle = activeSeo?.title || `Політика конфіденційності | ${companyName}`;
  const pageDesc = activeSeo?.description || `Політика конфіденційності ${companyName}. Інформація про збір, використання та захист персональних даних.`;

  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  const sections = [
    {
      title: '1. Загальні положення',
      content: `Ця Політика конфіденційності описує правила збору, використання та захисту персональних даних користувачів сайту ${siteUrl} (далі — «Сайт»), що належить ${companyName} (далі — «Компанія»). Використовуючи Сайт, ви погоджуєтесь з умовами цієї Політики.`
    },
    {
      title: '2. Які дані ми збираємо',
      content: `Ми можемо збирати такі категорії даних:`,
      list: [
        "Контактна інформація: ім'я, номер телефону — під час створення бронювання обміну валют.",
        'Технічні дані: IP-адреса, тип браузера, операційна система, час візиту — автоматично.',
        'Файли cookie: для покращення роботи Сайту та аналітики.',
        'Дані комунікацій: повідомлення через онлайн-чат на Сайті.'
      ]
    },
    {
      title: '3. Мета збору даних',
      content: 'Ваші персональні дані використовуються для:',
      list: [
        'Обробки бронювань та надання послуг обміну валют.',
        'Зв\'язку з вами щодо вашого бронювання.',
        'Покращення якості обслуговування та функціональності Сайту.',
        'Виконання вимог законодавства України.',
        'Аналізу використання Сайту (анонімна статистика).'
      ]
    },
    {
      title: '4. Захист даних',
      content: `${companyName} вживає організаційних та технічних заходів для захисту ваших персональних даних від несанкціонованого доступу, зміни, розкриття або знищення. Ми використовуємо SSL-шифрування для захисту передачі даних між вашим браузером та нашими серверами.`
    },
    {
      title: '5. Передача даних третім особам',
      content: 'Ми не продаємо та не передаємо ваші персональні дані третім особам, за винятком:',
      list: [
        'Випадків, коли це необхідно для виконання вимог законодавства.',
        'Аналітичних сервісів (Google Analytics, Google Tag Manager) — тільки анонімні дані.',
        'За вашою явною згодою.'
      ]
    },
    {
      title: '6. Файли Cookie',
      content: 'Сайт використовує файли cookie для:',
      list: [
        'Забезпечення коректної роботи Сайту.',
        'Аналізу трафіку та поведінки користувачів.',
        'Збереження ваших налаштувань.'
      ],
      extra: 'Ви можете налаштувати або вимкнути файли cookie у налаштуваннях вашого браузера. Зверніть увагу, що деякі функції Сайту можуть працювати некоректно без cookie.'
    },
    {
      title: '7. Ваші права',
      content: 'Відповідно до Закону України «Про захист персональних даних», ви маєте право:',
      list: [
        'Знати, які ваші персональні дані обробляються.',
        'Вимагати виправлення неточних або неповних даних.',
        'Вимагати видалення ваших персональних даних.',
        'Відкликати згоду на обробку персональних даних.',
        'Подати скаргу до Уповноваженого Верховної Ради з прав людини.'
      ]
    },
    {
      title: '8. Зміни до Політики',
      content: `Компанія залишає за собою право змінювати цю Політику конфіденційності. Актуальна версія завжди доступна на сторінці ${siteUrl}/privacy-policy. Рекомендуємо періодично переглядати цю сторінку.`
    },
    {
      title: '9. Контакти',
      content: `Якщо у вас виникли питання щодо цієї Політики конфіденційності або обробки ваших персональних даних, зв'яжіться з нами:`,
      list: [
        `Email: ${email}`,
        `Телефон: ${settings?.phone || '(096) 048-88-84'}`,
        `Адреса: м. Київ, Україна`
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-primary pt-28 pb-16">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-accent-yellow/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-accent-yellow" />
          </div>
          <h1 className="text-3xl lg:text-5xl font-bold text-white mb-4">
            {activeSeo?.h1 || 'Політика конфіденційності'}
          </h1>
          <p className="text-text-secondary text-lg max-w-xl mx-auto">
            Інформація про збір, використання та захист ваших персональних даних.
          </p>
        </div>

        {/* Effective Date */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary-light rounded-full border border-white/10 text-sm text-text-secondary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Дата останнього оновлення: {new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, idx) => (
            <div
              key={idx}
              className="bg-primary-light border border-white/10 rounded-2xl p-6 lg:p-8 hover:border-white/20 transition-colors"
            >
              <h2 className="text-xl font-bold text-white mb-4">{section.title}</h2>
              <p className="text-text-secondary leading-relaxed mb-3">{section.content}</p>
              {section.list && (
                <ul className="space-y-2 ml-1">
                  {section.list.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-text-secondary">
                      <span className="w-1.5 h-1.5 bg-accent-yellow rounded-full mt-2 shrink-0"></span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              {section.extra && (
                <p className="text-text-secondary leading-relaxed mt-3">{section.extra}</p>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center bg-primary-light border border-white/10 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-white mb-2">Маєте запитання?</h3>
          <p className="text-text-secondary mb-6">Зв'яжіться з нами — ми завжди готові допомогти.</p>
          <a
            href={settings?.contacts_url || '/contact'}
            className="inline-block px-8 py-3 bg-accent-yellow rounded-full text-primary font-bold hover:bg-yellow-400 transition-colors"
          >
            Зв'язатися з нами
          </a>
        </div>
      </div>
    </div>
  );
}
