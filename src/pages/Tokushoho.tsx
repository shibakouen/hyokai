import { Link } from 'react-router-dom';
import '@/styles/pro.css';

/**
 * 特定商取引法に基づく表記 (Act on Specified Commercial Transactions)
 * Required by Japanese law for Stripe payment compliance.
 * Content remains in Japanese regardless of site language setting.
 */
export default function Tokushoho() {
  return (
    <div className="pro-page">
      {/* Dashed Background Lines */}
      <div className="page_bg-lines_wrap">
        <div className="page_bg-line_col"></div>
        <div className="page_bg-line_col"></div>
        <div className="page_bg-line_col"></div>
        <div className="page_bg-line_col"></div>
        <div className="page_bg-line_col"></div>
      </div>

      {/* Navigation */}
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
          <Link to="/" className="nav_logo">
            <span className="nav_logo_icon">氷</span>
            Hyokai
          </Link>
          <div className="nav_btn_group">
            <Link to="/" className="c-button c-button--ghost">
              <span className="c-button_span">Back</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <section className="tokushoho_section">
        <div className="c-container">
          <div className="tokushoho_content">
            <h1 className="c-title-1 tokushoho_title">特定商取引法に基づく表記</h1>

            <div className="tokushoho_table">
              <div className="tokushoho_row">
                <div className="tokushoho_label">販売業者名</div>
                <div className="tokushoho_value">Seimitsu（セイミツ）</div>
              </div>

              <div className="tokushoho_row">
                <div className="tokushoho_label">運営統括責任者</div>
                <div className="tokushoho_value">宮崎ゆま</div>
              </div>

              <div className="tokushoho_row">
                <div className="tokushoho_label">所在地</div>
                <div className="tokushoho_value">〒105-0014 東京都港区芝1丁目2-1 3011号室</div>
              </div>

              <div className="tokushoho_row">
                <div className="tokushoho_label">メールアドレス</div>
                <div className="tokushoho_value">
                  <a href="mailto:fujisawaisagi@gmail.com" className="tokushoho_link">
                    fujisawaisagi@gmail.com
                  </a>
                </div>
              </div>

              <div className="tokushoho_row">
                <div className="tokushoho_label">電話番号</div>
                <div className="tokushoho_value">請求があった場合は遅滞なく開示いたします。</div>
              </div>

              <div className="tokushoho_row">
                <div className="tokushoho_label">販売価格</div>
                <div className="tokushoho_value">
                  各プランの価格は、サービス画面上に表示された金額に準じます。<br />
                  価格はすべて税込表示です。
                </div>
              </div>

              <div className="tokushoho_row">
                <div className="tokushoho_label">お支払方法</div>
                <div className="tokushoho_value">
                  クレジットカード決済（Stripe を通じた決済）<br />
                  対応カード：Visa、Mastercard、American Express、JCB 等
                </div>
              </div>

              <div className="tokushoho_row">
                <div className="tokushoho_label">お支払時期</div>
                <div className="tokushoho_value">
                  サブスクリプション契約成立時に初回決済が行われます。<br />
                  以降、契約期間に応じて自動で継続課金されます。
                </div>
              </div>

              <div className="tokushoho_row">
                <div className="tokushoho_label">サービス提供時期</div>
                <div className="tokushoho_value">お支払い確認後、即時ご利用いただけます。</div>
              </div>

              <div className="tokushoho_row">
                <div className="tokushoho_label">返品・キャンセル・返金について</div>
                <div className="tokushoho_value">
                  デジタルサービスの性質上、購入後の返品・返金は原則としてお受けしておりません。<br />
                  サブスクリプションはいつでも解約可能ですが、解約後も契約期間終了まではサービスをご利用いただけます。<br />
                  日割り計算での返金は行っておりません。
                </div>
              </div>

              <div className="tokushoho_row">
                <div className="tokushoho_label">動作環境</div>
                <div className="tokushoho_value">
                  推奨ブラウザ：Google Chrome、Safari、Firefox、Microsoft Edge（いずれも最新版）<br />
                  JavaScript が有効であること。
                </div>
              </div>

              <div className="tokushoho_row">
                <div className="tokushoho_label">特別条件</div>
                <div className="tokushoho_value">
                  本サービスの利用には、利用規約およびプライバシーポリシーへの同意が必要です。
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="footer_wrap footer_wrap--simple">
        <div className="c-container">
          <div className="footer_bottom">
            <span>&copy; {new Date().getFullYear()} Seimitsu. All rights reserved.</span>
            <Link to="/" className="footer_social_link">Hyokai</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
