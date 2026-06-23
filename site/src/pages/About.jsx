import React from 'react';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import { Reveal, Icon, Section } from '../components/ui/index.js';
import { useLang } from '../lib/LangContext.jsx';

const COPY = {
  storyTitle: {
    ru: 'О нашей компании',
    uz: 'Kompaniyamiz haqida',
    en: 'About our company',
  },
  story: {
    ru: 'Наша компания занимается производством контрольно-измерительных приборов на протяжении более чем 5 лет. Мы занимаемся производством и поставкой манометров, термоманометров, вакуумметров, термометров, индикаторов давления, преобразователей давления и дополнительного оборудования. Наша компания обеспечивает качественную сборку и точную калибровку измерительных приборов. Наша компания может предложить вам широкую линейку предлагаемых приборов, возможность производства приборов под заказ, также у нас имеется склад полу готовой продукции что обеспечит минимальные сроки поставки. Более того компания предоставляет услуги ремонта и калибровки контрольно-измерительных приборов. Вы можете купить наши манометры в Ташкенте, а так же в других крупных городах Узбекистана.',
    uz: 'Kompaniyamiz 5 yildan ortiq vaqt davomida nazorat-oʻlchov asboblarini ishlab chiqarish bilan shugʻullanadi. Biz manometrlar, termomanometrlar, vakuummetrlar, termometrlar, bosim indikatorlari, bosim oʻzgartkichlari va qoʻshimcha jihozlarni ishlab chiqaramiz va yetkazib beramiz. Kompaniyamiz oʻlchov asboblarini sifatli yigʻish va aniq kalibrlashni taʼminlaydi. Biz sizga keng turdagi asboblarni, buyurtma asosida asbob ishlab chiqarish imkoniyatini taklif eta olamiz, shuningdek bizda yarim tayyor mahsulotlar ombori mavjud boʻlib, bu yetkazib berishning eng qisqa muddatlarini taʼminlaydi. Bundan tashqari, kompaniya nazorat-oʻlchov asboblarini taʼmirlash va kalibrlash xizmatlarini koʻrsatadi. Bizning manometrlarimizni Toshkentda, shuningdek Oʻzbekistonning boshqa yirik shaharlarida ham sotib olishingiz mumkin.',
    en: 'Our company has been manufacturing control and measuring instruments for more than 5 years. We produce and supply pressure gauges, thermomanometers, vacuum gauges, thermometers, pressure indicators, pressure transducers, and additional equipment. We ensure high-quality assembly and precise calibration of every measuring instrument. We can offer you a wide range of instruments, the option to build devices to order, and a stock of semi-finished products that keeps delivery times to a minimum. Beyond that, the company provides repair and calibration services for control and measuring instruments. You can buy our pressure gauges in Tashkent, as well as in other major cities of Uzbekistan.',
  },
};

const HIGHLIGHTS = [
  ['gauge', { ru: 'Производство КИП', uz: 'KIP ishlab chiqarish', en: 'Instrument manufacturing' }],
  ['layers', { ru: 'Склад полуфабрикатов', uz: 'Yarim tayyor mahsulot ombori', en: 'Semi-finished stock' }],
  ['shield', { ru: 'Точная калибровка', uz: 'Aniq kalibrlash', en: 'Precise calibration' }],
  ['truck', { ru: 'Минимальные сроки', uz: 'Eng qisqa muddatlar', en: 'Minimal lead times' }],
];

export default function About() {
  const { lang } = useLang();
  const title = COPY.storyTitle[lang] || COPY.storyTitle.en;
  const story = COPY.story[lang] || COPY.story.en;

  return (
    <div className="mk">
      <StoreHeader />
      <main id="main">

        {/* Full-screen autoplay background video */}
        <section style={{ width: '100%', height: '100vh', background: 'var(--ink-bg)', overflow: 'hidden' }}>
          <video
            src="/about/aboutbgvideo.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-label={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </section>

        {/* Story + gif */}
        <Section as="section">
          <div className="mk-split" style={{ alignItems: 'center' }}>
            <Reveal variant="left">
              <div className="mk-eyebrow">{title}</div>
              <h1 style={{ fontSize: 'clamp(34px,5vw,64px)', fontWeight: 600, letterSpacing: '-0.03em', margin: '16px 0 0' }}>
                {title}
              </h1>
              <p className="mk-muted" style={{ fontSize: 16.5, lineHeight: 1.7, margin: '28px 0 0', maxWidth: 560 }}>
                {story}
              </p>
              <div className="mk-grid mk-cards-2" style={{ marginTop: 36 }}>
                {HIGHLIGHTS.map(([icon, names], i) => (
                  <Reveal key={icon} index={i} className="mk-row" style={{ gap: 10 }}>
                    <Icon name={icon} size={18} style={{ color: 'var(--accent-ink)' }} />
                    <span style={{ fontSize: 14.5, fontWeight: 500 }}>{names[lang] || names.en}</span>
                  </Reveal>
                ))}
              </div>
            </Reveal>

            <Reveal variant="scale" index={1} className="mk-card" style={{ overflow: 'hidden' }}>
              <img
                src="/about/aboutgif.gif"
                alt={title}
                loading="lazy"
                style={{ width: '100%', display: 'block' }}
              />
            </Reveal>
          </div>
        </Section>

      </main>
      <StoreFooter />
    </div>
  );
}
