import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getLandingTranslations, Language } from '@/lib/landingTranslations';
import '@/styles/landing.css';

const Landing = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine language from URL path
  const lang: Language = location.pathname === '/ja' ? 'ja' : 'en';
  const t = getLandingTranslations(lang);

  // Language toggle handler
  const toggleLanguage = () => {
    if (lang === 'en') {
      navigate('/ja');
    } else {
      navigate('/');
    }
  };
  // Carousel state for hero section
  const [activeSlide, setActiveSlide] = useState(0);

  // Demo tabs state
  const [activeTab, setActiveTab] = useState('recipes');
  const [demoStatus, setDemoStatus] = useState<Record<string, 'idle' | 'transforming' | 'done'>>({
    recipes: 'idle',
    trip: 'idle',
    raise: 'idle',
    email: 'idle',
  });

  // FAQ accordion state
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  // Auto-rotate carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 6);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Handle demo transform button click
  const handleDemoTransform = (tab: string) => {
    if (demoStatus[tab] === 'done') return;
    setDemoStatus(prev => ({ ...prev, [tab]: 'transforming' }));
    setTimeout(() => {
      setDemoStatus(prev => ({ ...prev, [tab]: 'done' }));
    }, 1500);
  };

  // Toggle FAQ
  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return (
    <>
      {/* Dashed Background Lines — MERIDIAN MOTIF */}
      <div className="page_bg-lines_wrap">
        <div className="page_bg-line_col"></div>
        <div className="page_bg-line_col"></div>
        <div className="page_bg-line_col"></div>
        <div className="page_bg-line_col"></div>
        <div className="page_bg-line_col"></div>
      </div>

      {/* Navigation — MERIDIAN PATTERN */}
      <nav className="nav_bar">
        <div className="nav_progressive-blur_wrap">
          <div className="nav_progressive-blur_panel is-1"></div>
          <div className="nav_progressive-blur_panel is-2"></div>
          <div className="nav_progressive-blur_panel is-3"></div>
          <div className="nav_progressive-blur_panel is-4"></div>
          <div className="nav_progressive-blur_panel is-5"></div>
          <div className="nav_progressive-blur_panel is-6"></div>
          <div className="nav_progressive-blur_panel is-7"></div>
          <div className="nav_progressive-blur_panel is-8"></div>
          <div className="nav_progressive-blur_panel is-9"></div>
          <div className="nav_progressive-blur_panel is-10"></div>
        </div>
        <div className="c-container nav_wrap">
          <a href="#" className="nav_logo">
            <span className="nav_logo_icon">氷</span>
            Hyokai
          </a>
          <ul className="nav_menu_list">
            <li>
              <a href="#how-it-works" className="nav_menu_link">
                <span className="nav_menu_link_text c-text-4-mono">{t.nav.howItWorks}</span>
              </a>
            </li>
            <li>
              <a href="#features" className="nav_menu_link">
                <span className="nav_menu_link_text c-text-4-mono">{t.nav.features}</span>
              </a>
            </li>
            <li>
              <a href="#pricing" className="nav_menu_link">
                <span className="nav_menu_link_text c-text-4-mono">{t.nav.pricing}</span>
              </a>
            </li>
          </ul>
          <div className="nav_btn_group">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="c-button c-button--ghost nav_lang_toggle"
              aria-label="Switch language"
            >
              <span className="c-button_span">{lang === 'en' ? '日本語' : 'EN'}</span>
            </button>
            <Link to="/app" className="c-button c-button--ghost">
              <span className="c-button_span">{t.nav.logIn}</span>
            </Link>
            <Link to="/app" className="c-button c-button--brand">
              <div className="c-button_bg"></div>
              <span className="c-button_span">{t.nav.getStarted}</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section — MERIDIAN ASYMMETRIC LAYOUT */}
      <section className="home_hero_section">
        <div className="c-container">
          <div className="home_hero_layout">
            {/* Left Column: Content */}
            <div className="home_hero_col">
              <div className="home_hero_badge">
                <span className="home_hero_badge_dot"></span>
                {t.hero.badge}
              </div>

              <h1 className="c-title-0 home_hero_headline c-max-5-col">
                {t.hero.headline}
                <span className="gradient-text">{t.hero.headlineGradient}</span>
              </h1>

              <p className="c-text-2 home_hero_desc c-max-4-col">
                {t.hero.description}
              </p>

              <div className="g_btn_group">
                <Link to="/app" className="c-button c-button--brand c-button--lg">
                  <div className="c-button_bg"></div>
                  <span className="c-button_span">{t.hero.ctaPrimary}</span>
                </Link>
                <a href="#demo" className="c-button c-button--light c-button--lg">
                  <div className="c-button_bg"></div>
                  <span className="c-button_span">{t.hero.ctaSecondary}</span>
                </a>
              </div>
            </div>

            {/* Right Column: Ice Ball with Floating Modal */}
            <div className="home_hero_col">
              <div className="home_hero_float home_hero_float--1"></div>
              <div className="home_hero_float home_hero_float--2"></div>

              <div className="home_hero_sphere_wrap">
                <div className="home_hero_sphere_ring"></div>
                <div className="home_hero_sphere_ring"></div>
                <div className="home_hero_sphere_ring"></div>
                <div className="home_hero_sphere">
                  {/* Pure ice ball - no grid */}
                  <div className="home_hero_sphere_highlight"></div>
                  <div className="home_hero_sphere_highlight_secondary"></div>
                </div>

                {/* Floating Transform Modal Carousel */}
                <div className="hero_modal_overlay">
                  <div className="hero_modal">
                    <div className="hero_modal_carousel">
                      {t.carousel.slides.map((slide, idx) => (
                        <div key={idx} className={`hero_modal_slide ${activeSlide === idx ? 'active' : ''}`} data-slide={idx}>
                          <div className="hero_modal_input">
                            <div className="hero_modal_label hero_modal_label--user">{t.carousel.youType}</div>
                            <div className="hero_modal_text hero_modal_text--user">{slide.input}</div>
                          </div>
                          <div className="hero_modal_arrow">→</div>
                          <div className="hero_modal_output">
                            <div className="hero_modal_label hero_modal_label--hyokai">{t.carousel.hyokaiCreates}</div>
                            <div className="hero_modal_text hero_modal_text--hyokai">{slide.output}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Carousel Navigation Dots */}
                  <div className="hero_carousel_dots">
                    {[0, 1, 2, 3, 4, 5].map((idx) => (
                      <button
                        key={idx}
                        className={`hero_carousel_dot ${activeSlide === idx ? 'active' : ''}`}
                        onClick={() => setActiveSlide(idx)}
                        aria-label={`Example ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee — Trust Logos */}
      <section className="marquee_section">
        <div className="c-container">
          <p className="c-text-4 cc-onsurface-softer marquee_label">{t.marquee.trustedBy}</p>
        </div>
        <div className="marquee_wrap">
          <div className="marquee_track">
            {['✍️', '📊', '🎨', '💼', '📚', '🔬', '💻', '📝'].map((icon, idx) => (
              <div key={idx} className="marquee_item"><span className="marquee_item_icon">{icon}</span> {t.marquee.users[idx]}</div>
            ))}
            {/* Duplicate for seamless loop */}
            {['✍️', '📊', '🎨', '💼', '📚', '🔬', '💻', '📝'].map((icon, idx) => (
              <div key={`dup-${idx}`} className="marquee_item"><span className="marquee_item_icon">{icon}</span> {t.marquee.users[idx]}</div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works — Steps Section */}
      <section id="how-it-works" className="steps_section c-section-padding">
        <div className="c-container">
          <div className="section_header_wrap" style={{ marginBottom: '3rem' }}>
            <div>
              <h2 className="c-title-2">{t.howItWorks.title}</h2>
            </div>
            <div>
              <p className="c-text-3 cc-onsurface-weak">{t.howItWorks.subtitle}</p>
            </div>
          </div>

          <div className="steps_grid">
            {t.howItWorks.steps.map((step, idx) => (
              <div key={idx} className="step_card">
                {idx < 2 && <div className="step_connector"></div>}
                <div className="step_number">{idx + 1}</div>
                <h3 className="c-title-3 step_title">{step.title}</h3>
                <p className="c-text-3 cc-onsurface-weak">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section — MERIDIAN CARDS */}
      <section id="features" className="home_feat_section c-section-padding">
        <div className="c-container">
          <div className="section_header_wrap">
            <div className="c-max-6-col">
              <h2 className="c-title-2">
                {t.features.title} <span className="cc-brand">{t.features.titleHighlight}</span> {t.features.titleEnd}
              </h2>
            </div>
            <div className="c-max-3-col">
              <p className="c-text-3 cc-onsurface-weak">
                {t.features.subtitle}
              </p>
            </div>
          </div>

          <div className="home_feat_grid">
            {t.features.cards.map((card, idx) => (
              <div key={idx} className="home_feat_card">
                <div className="g_feat_content_bg-ball"></div>
                <div className="home_feat_card_icon">{card.icon}</div>
                <h3 className="c-title-3 home_feat_card_title">{card.title}</h3>
                <p className="c-text-3 cc-onsurface-weak">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats_section c-section-padding">
        <div className="c-container">
          <div className="stats_grid">
            <div className="stat_item">
              <div className="stat_number">50K+</div>
              <div className="stat_label">{t.stats.promptsTransformed}</div>
            </div>
            <div className="stat_item">
              <div className="stat_number">12K+</div>
              <div className="stat_label">{t.stats.happyUsers}</div>
            </div>
            <div className="stat_item">
              <div className="stat_number">3.2x</div>
              <div className="stat_label">{t.stats.betterResults}</div>
            </div>
            <div className="stat_item">
              <div className="stat_number">4.9★</div>
              <div className="stat_label">{t.stats.userRating}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section — INTERACTIVE TRANSFORMATION SHOWCASE */}
      <section id="demo" className="home_demo_section c-section-padding">
        <div className="c-container">
          <div className="text-center" style={{ marginBottom: '2rem' }}>
            <h2 className="c-title-2" style={{ marginBottom: '0.75rem' }}>
              {t.demo.title} <span style={{ color: 'var(--blue-500)' }}>{t.demo.titleHighlight}</span> {t.demo.titleEnd}
            </h2>
            <p className="c-text-2 cc-onsurface-weak c-max-4-col mx-auto">
              {t.demo.subtitle}
            </p>
          </div>

          {/* Interactive Category Tabs */}
          <div className="demo_tabs">
            <button
              className={`demo_tab ${activeTab === 'recipes' ? 'active' : ''}`}
              onClick={() => setActiveTab('recipes')}
            >
              <span className="demo_tab_icon">🍳</span>{t.demo.tabs.recipes}
            </button>
            <button
              className={`demo_tab ${activeTab === 'trip' ? 'active' : ''}`}
              onClick={() => setActiveTab('trip')}
            >
              <span className="demo_tab_icon">✈️</span>{t.demo.tabs.trip}
            </button>
            <button
              className={`demo_tab ${activeTab === 'raise' ? 'active' : ''}`}
              onClick={() => setActiveTab('raise')}
            >
              <span className="demo_tab_icon">💰</span>{t.demo.tabs.raise}
            </button>
            <button
              className={`demo_tab ${activeTab === 'email' ? 'active' : ''}`}
              onClick={() => setActiveTab('email')}
            >
              <span className="demo_tab_icon">📧</span>{t.demo.tabs.email}
            </button>
          </div>

          {/* Tab Panels */}
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {(['recipes', 'trip', 'raise', 'email'] as const).map((panelKey) => (
              <div key={panelKey} className={`demo_panel ${activeTab === panelKey ? 'active' : ''}`} data-panel={panelKey} data-status={demoStatus[panelKey]}>
                <div className="demo_three_col">
                  <div className="demo_col">
                    <div className="demo_col_header">{t.demo.rawIdea}</div>
                    <div className="demo_col_body">{t.demo.panels[panelKey].input}</div>
                  </div>
                  <div className="demo_arrow_col">
                    <button className="demo_transform_btn" onClick={() => handleDemoTransform(panelKey)}>
                      <span className="demo_transform_icon">✨</span>
                    </button>
                    <div className="demo_status">
                      <span className="demo_status_label">{t.demo.status}</span>
                      <span className="demo_status_text">
                        {demoStatus[panelKey] === 'idle' && t.demo.clickToTransform}
                        {demoStatus[panelKey] === 'transforming' && t.demo.transforming}
                        {demoStatus[panelKey] === 'done' && t.demo.complete}
                      </span>
                    </div>
                  </div>
                  <div className="demo_col">
                    <div className="demo_col_header demo_col_header--hyokai">{t.demo.hyokaiOutput}</div>
                    <div className="demo_col_body">
                      {demoStatus[panelKey] !== 'done' ? (
                        <div className="demo_output_placeholder">
                          <div className="demo_placeholder_icon">🔮</div>
                          <div className="demo_placeholder_text">{t.demo.placeholder}</div>
                        </div>
                      ) : (
                        <div className="demo_output_result">{t.demo.panels[panelKey].output}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Progress Bar — Barberpole Animation */}
          <div style={{ maxWidth: '400px', margin: '3rem auto 0' }}>
            <div className="progress_bar"></div>
            <p className="c-text-4-mono cc-onsurface-weak text-center" style={{ marginTop: '0.75rem' }}>
              {t.demo.processing}
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials_section c-section-padding">
        <div className="c-container">
          <div className="text-center" style={{ marginBottom: '3rem' }}>
            <h2 className="c-title-2" style={{ marginBottom: '0.75rem' }}>{t.testimonials.title}</h2>
            <p className="c-text-2 cc-onsurface-weak">{t.testimonials.subtitle}</p>
          </div>

          <div className="testimonials_grid">
            {t.testimonials.cards.map((card, idx) => (
              <div key={idx} className="testimonial_card">
                <div className="testimonial_stars">★★★★★</div>
                <p className="testimonial_text c-text-3">{card.text}</p>
                <div className="testimonial_author">
                  <div className="testimonial_avatar">{card.initials}</div>
                  <div>
                    <div className="testimonial_name">{card.name}</div>
                    <div className="testimonial_role">{card.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing_section c-section-padding">
        <div className="c-container">
          <div className="text-center" style={{ marginBottom: '3rem' }}>
            <h2 className="c-title-2" style={{ marginBottom: '0.75rem' }}>{t.pricing.title}</h2>
            <p className="c-text-2 cc-onsurface-weak">{t.pricing.subtitle}</p>
          </div>

          <div className="pricing_grid">
            {/* Starter */}
            <div className="pricing_card">
              <div className="pricing_name">{t.pricing.tiers.starter.name}</div>
              <div className="pricing_tier">{t.pricing.tiers.starter.tier}</div>
              <div className="pricing_price">
                <span className="pricing_amount">{t.pricing.tiers.starter.price}</span>
                <span className="pricing_period">{t.pricing.perMonth}</span>
              </div>
              <p className="pricing_desc">{t.pricing.tiers.starter.description}</p>
              <ul className="pricing_features">
                {t.pricing.tiers.starter.features.map((feature, idx) => (
                  <li key={idx} className="pricing_feature">
                    <span className="pricing_feature_check">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/pro" className="c-button c-button--ghost pricing_cta">
                <span className="c-button_span">{t.pricing.getStarted}</span>
              </Link>
            </div>

            {/* Pro (Featured) */}
            <div className="pricing_card pricing_card--featured">
              <div className="pricing_badge">{t.pricing.mostPopular}</div>
              <div className="pricing_name">{t.pricing.tiers.pro.name}</div>
              <div className="pricing_tier">{t.pricing.tiers.pro.tier}</div>
              <div className="pricing_price">
                <span className="pricing_amount">{t.pricing.tiers.pro.price}</span>
                <span className="pricing_period">{t.pricing.perMonth}</span>
              </div>
              <p className="pricing_desc">{t.pricing.tiers.pro.description}</p>
              <ul className="pricing_features">
                {t.pricing.tiers.pro.features.map((feature, idx) => (
                  <li key={idx} className="pricing_feature">
                    <span className="pricing_feature_check">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/pro" className="c-button c-button--brand pricing_cta">
                <div className="c-button_bg"></div>
                <span className="c-button_span">{t.pricing.startTrial}</span>
              </Link>
            </div>

            {/* Business */}
            <div className="pricing_card pricing_card--business">
              <div className="pricing_name">{t.pricing.tiers.business.name}</div>
              <div className="pricing_tier">{t.pricing.tiers.business.tier}</div>
              <div className="pricing_price">
                <span className="pricing_amount">{t.pricing.tiers.business.price}</span>
                <span className="pricing_period">{t.pricing.perMonth}</span>
              </div>
              <p className="pricing_desc">{t.pricing.tiers.business.description}</p>
              <ul className="pricing_features">
                {t.pricing.tiers.business.features.map((feature, idx) => (
                  <li key={idx} className="pricing_feature">
                    <span className="pricing_feature_check">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/pro" className="c-button c-button--ghost pricing_cta">
                <span className="c-button_span">{t.pricing.getStarted}</span>
              </Link>
            </div>

            {/* Max */}
            <div className="pricing_card pricing_card--max">
              <div className="pricing_name">{t.pricing.tiers.max.name}</div>
              <div className="pricing_tier">{t.pricing.tiers.max.tier}</div>
              <div className="pricing_price">
                <span className="pricing_amount">{t.pricing.tiers.max.price}</span>
                <span className="pricing_period">{t.pricing.perMonth}</span>
              </div>
              <p className="pricing_desc">{t.pricing.tiers.max.description}</p>
              <ul className="pricing_features">
                {t.pricing.tiers.max.features.map((feature, idx) => (
                  <li key={idx} className="pricing_feature">
                    <span className="pricing_feature_check">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/pro" className="c-button c-button--ghost pricing_cta" style={{ borderColor: 'rgba(139, 92, 246, 0.3)', color: 'white' }}>
                <span className="c-button_span">{t.pricing.getStarted}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq_section c-section-padding">
        <div className="c-container">
          <div className="text-center" style={{ marginBottom: '3rem' }}>
            <h2 className="c-title-2" style={{ marginBottom: '0.75rem' }}>{t.faq.title}</h2>
            <p className="c-text-2 cc-onsurface-weak">{t.faq.subtitle}</p>
          </div>

          <div className="faq_grid">
            {t.faq.items.map((item, idx) => (
              <div key={idx} className={`faq_item ${openFAQ === idx ? 'is-open' : ''}`}>
                <button className="faq_question" onClick={() => toggleFAQ(idx)}>
                  {item.question}
                  <span className="faq_icon">+</span>
                </button>
                <div className="faq_answer">
                  <div className="faq_answer_inner">
                    <p className="faq_answer_text">{item.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pro Promo Section — Purple Theme */}
      <section className="pro_promo_section">
        <div className="c-container">
          <div className="pro_promo_content">
            <div className="pro_promo_badge">{t.proPromo.badge}</div>
            <h2 className="c-title-1 pro_promo_title">{t.proPromo.title}</h2>
            <p className="c-text-2 pro_promo_subtitle">{t.proPromo.subtitle}</p>
            <div className="pro_promo_features">
              {t.proPromo.features.map((feature, idx) => (
                <span key={idx} className="pro_promo_feature">
                  <span className="pro_promo_feature_check">✓</span>
                  {feature}
                </span>
              ))}
            </div>
            <Link to="/pro" className="c-button c-button--purple c-button--lg">
              <div className="c-button_bg"></div>
              <span className="c-button_span">{t.proPromo.cta}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="cta_section">
        <div className="c-container">
          <div className="cta_content">
            <h2 className="c-title-1 cta_title c-max-5-col mx-auto">{t.cta.title}</h2>
            <p className="c-text-1 cta_desc c-max-4-col mx-auto">{t.cta.subtitle}</p>
            <div className="cta_buttons">
              <Link to="/pro" className="c-button c-button--white c-button--lg">
                <div className="c-button_bg"></div>
                <span className="c-button_span">{t.cta.primaryBtn}</span>
              </Link>
              <a href="mailto:hello@hyokai.ai" className="c-button c-button--outline-white c-button--lg">
                <span className="c-button_span">{t.cta.secondaryBtn}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer — MERIDIAN PATTERN WITH GLOBE GRID */}
      <footer className="footer_wrap">
        <div className="c-container">
          <div className="footer_top_wrap">
            <div className="footer_cta">
              <h2 className="c-title-2 footer_cta_title c-max-4-col">
                {t.footer.ctaTitle} <span>{t.footer.ctaTitleHighlight}</span>?
              </h2>
              <p className="c-text-3 footer_cta_desc c-max-3-col">
                {t.footer.ctaDescription}
              </p>
              <div className="g_btn_group">
                <Link to="/pro" className="c-button c-button--brand">
                  <div className="c-button_bg"></div>
                  <span className="c-button_span">{t.footer.ctaBtn}</span>
                </Link>
              </div>
            </div>

            <div className="footer_sitemap">
              <div className="footer_sitemap_col">
                <h4>{t.footer.product.title}</h4>
                <ul className="footer_sitemap_list">
                  <li><a href="#how-it-works" className="footer_sitemap_link">{t.footer.product.howItWorks}</a></li>
                  <li><a href="#pricing" className="footer_sitemap_link">{t.footer.product.pricing}</a></li>
                  <li><a href="#demo" className="footer_sitemap_link">{t.footer.product.examples}</a></li>
                  <li><Link to="/app" className="footer_sitemap_link">{t.footer.product.openApp}</Link></li>
                </ul>
              </div>
              <div className="footer_sitemap_col">
                <h4>{t.footer.company.title}</h4>
                <ul className="footer_sitemap_list">
                  <li><span className="footer_sitemap_link footer_sitemap_link--disabled">{t.footer.company.about}</span></li>
                  <li><span className="footer_sitemap_link footer_sitemap_link--disabled">{t.footer.company.blog}</span></li>
                  <li><span className="footer_sitemap_link footer_sitemap_link--disabled">{t.footer.company.careers}</span></li>
                  <li><a href="mailto:hello@hyokai.ai" className="footer_sitemap_link">{t.footer.company.contact}</a></li>
                </ul>
              </div>
              <div className="footer_sitemap_col">
                <h4>{t.footer.legal.title}</h4>
                <ul className="footer_sitemap_list">
                  <li><span className="footer_sitemap_link footer_sitemap_link--disabled">{t.footer.legal.privacy}</span></li>
                  <li><span className="footer_sitemap_link footer_sitemap_link--disabled">{t.footer.legal.terms}</span></li>
                  <li><span className="footer_sitemap_link footer_sitemap_link--disabled">{t.footer.legal.security}</span></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Pure Ice Globe - no grid */}
          <div className="footer_globe_wrap">
            <div className="footer_globe"></div>
            <div className="footer_globe_highlight"></div>
          </div>

          <div className="footer_bottom">
            <span>{t.footer.copyright}</span>
            <div className="footer_social">
              <a href="https://x.com/hyokai_ai" target="_blank" rel="noopener noreferrer" className="footer_social_link">{t.footer.social.twitter}</a>
              <a href="https://github.com/hyokai" target="_blank" rel="noopener noreferrer" className="footer_social_link">{t.footer.social.github}</a>
              <span className="footer_social_link footer_social_link--disabled">{t.footer.social.discord}</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Landing;
