'use client';
import Layout from '@/components/Layout';
import Link from 'next/link';

export default function PrivacyPage() {
  const lastUpdated = 'May 16, 2026';

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black mb-4">Privacy Policy</h1>
            <p className="text-zinc-400 text-lg">Last updated: {lastUpdated}</p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <span className="px-3 py-1 bg-cyan-900/30 text-cyan-400 text-xs font-bold rounded-full border border-cyan-800/50">COPPA COMPLIANT</span>
              <span className="px-3 py-1 bg-emerald-900/30 text-emerald-400 text-xs font-bold rounded-full border border-emerald-800/50">VERIFIED SAFE</span>
            </div>
          </div>

          <div className="bg-zinc-900/50 rounded-2xl p-8 border border-zinc-800 space-y-8">
            <div className="prose prose-invert max-w-none">
              {/* SECTION 1 - Introduction */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">1. Introduction</h2>
              <p className="text-zinc-300 mb-6">
                Don O'Connor Media ("we," "us," "our") operates the IN THE GAME platform (the "Platform"). 
                We are committed to protecting your privacy and handling your personal information with 
                transparency and care. This Privacy Policy explains how we collect, use, store, protect, 
                and disclose information when you use the Platform.
              </p>
              <p className="text-zinc-300 mb-6">
                This policy applies to all users of the Platform, including athletes, coaches, recruiters, 
                parents/guardians, guests, and viewers. We comply with the Children's Online Privacy 
                Protection Act (COPPA), applicable Tennessee state laws, and all other relevant privacy 
                regulations.
              </p>

              {/* SECTION 2 - Information We Collect */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">2. Information We Collect</h2>
              
              <h3 className="text-xl font-bold mb-3 text-white">2.1 Information You Provide</h3>
              <ul className="text-zinc-300 space-y-2 mb-4 list-disc list-inside">
                <li><strong className="text-white">Account Information:</strong> Username, email address, password (encrypted), first and last name</li>
                <li><strong className="text-white">Profile Information:</strong> School name, graduation year, position/sport, profile photo, athletic stats, and biographical information you choose to share</li>
                <li><strong className="text-white">Media Content:</strong> Videos, images, and other media you upload, including athletic drills, highlights, and performances</li>
                <li><strong className="text-white">Age Verification:</strong> Date of birth (used solely for age verification and not retained for other purposes)</li>
                <li><strong className="text-white">Parental Information:</strong> Parent/guardian email and name (for COPPA compliance purposes only)</li>
              </ul>

              <h3 className="text-xl font-bold mb-3 text-white">2.2 Information Collected Automatically</h3>
              <ul className="text-zinc-300 space-y-2 mb-4 list-disc list-inside">
                <li><strong className="text-white">Usage Data:</strong> Pages visited, features used, time spent on Platform</li>
                <li><strong className="text-white">Device Information:</strong> Browser type, device type, operating system, IP address (anonymized)</li>
                <li><strong className="text-white">Streaming Data:</strong> Connection quality metrics (bitrate, latency) for service optimization</li>
                <li><strong className="text-white">Cookies:</strong> Essential cookies for authentication and platform functionality</li>
              </ul>

              <h3 className="text-xl font-bold mb-3 text-white">2.3 What We DO NOT Collect</h3>
              <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-xl p-4 mb-6">
                <ul className="text-zinc-300 space-y-2 list-disc list-inside">
                  <li>🚫 Driver's license numbers or government-issued IDs</li>
                  <li>🚫 Full credit or debit card numbers (Stripe handles payments — we only store a payment ID reference)</li>
                  <li>🚫 Location tracking data (GPS or precise location)</li>
                  <li>🚫 Private messages or chat content (beyond guest streaming sessions)</li>
                  <li>🚫 Medical or health information</li>
                  <li>🚫 Social Security numbers</li>
                </ul>
              </div>

              {/* SECTION 3 - How We Use Your Information */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">3. How We Use Your Information</h2>
              <p className="text-zinc-300 mb-4">We use the information we collect for the following purposes:</p>
              <ul className="text-zinc-300 space-y-2 mb-6 list-disc list-inside">
                <li>✅ To create and manage your account</li>
                <li>✅ To provide, maintain, and improve the Platform's features and functionality</li>
                <li>✅ To verify your age and comply with COPPA requirements</li>
                <li>✅ To process parental consent for users under 13</li>
                <li>✅ To broadcast and share your athletic content as you direct</li>
                <li>✅ To communicate with you about platform updates, support requests, and policy changes</li>
                <li>✅ To detect, prevent, and address technical issues, fraud, and abuse</li>
                <li>✅ To moderate content and enforce our community guidelines</li>
                <li>✅ To comply with legal obligations and regulatory requirements</li>
              </ul>
              <p className="text-zinc-300 mb-6">
                <strong className="text-white">We DO NOT</strong> sell your personal information to third parties. 
                We DO NOT use your data for behavioral advertising or marketing profiling.
              </p>

              {/* SECTION 4 - COPPA Compliance */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">4. COPPA Compliance — Children Under 13</h2>
              <div className="bg-cyan-900/20 border border-cyan-800/50 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-bold text-cyan-300 mb-3">🔒 Our Commitment to Children's Privacy</h3>
                <p className="text-zinc-300 mb-4">
                  In compliance with the Children's Online Privacy Protection Act (COPPA), we have implemented 
                  the following protections for users under 13:
                </p>
                <ul className="text-zinc-300 space-y-3 mb-4 list-disc list-inside">
                  <li><strong className="text-cyan-300">Age Gate:</strong> We require a date of birth at registration. If a user indicates they are under 13, 
                  their signup is halted immediately and NO personal data is stored.</li>
                  <li><strong className="text-cyan-300">Verifiable Parental Consent:</strong> Before any data can be collected from a user under 13, 
                  we require verifiable parental consent through one of these FTC-approved methods:
                    <ul className="ml-6 mt-2 space-y-1 list-circle list-inside">
                      <li>🎥 Video chat verification with our staff</li>
                      <li>📝 Signed parental consent form returned via email or mail</li>
                      <li>💳 Credit card micro-transaction ($0.50, fully refunded)</li>
                    </ul>
                  </li>
                  <li><strong className="text-cyan-300">Zero Data Before Consent:</strong> We do not collect, store, or process any personal 
                  information from under-13 users until verifiable parental consent has been obtained.</li>
                  <li><strong className="text-cyan-300">Minimal Data Collection:</strong> We only collect athletic-related information and account 
                  essentials — nothing more than necessary.</li>
                  <li><strong className="text-cyan-300">Parental Control:</strong> Parents can review, modify, or delete their child's data 
                  and revoke consent at any time.</li>
                </ul>
                <p className="text-zinc-300">
                  <strong className="text-cyan-300">Data We May Collect After Consent:</strong> Only athletic-related information 
                  (username, stats, media uploads, school name) and basic account information (email, 
                  parent contact). We never collect location data, private messages, or sensitive 
                  personal information from children.
                </p>
              </div>

              {/* SECTION 5 - Parental Rights */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">5. Parental Rights & Data Control</h2>
              <p className="text-zinc-300 mb-4">
                Parents and legal guardians have the following rights regarding their child's information:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                  <h4 className="text-white font-bold text-sm mb-2">🔍 Right to Review</h4>
                  <p className="text-zinc-400 text-xs">Request to review all personal information we have collected about your child. We will respond within 30 days.</p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                  <h4 className="text-white font-bold text-sm mb-2">✋ Right to Revoke</h4>
                  <p className="text-zinc-400 text-xs">Revoke your consent at any time via the consent link sent to your email. Data collection will stop immediately.</p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                  <h4 className="text-white font-bold text-sm mb-2">🗑️ Right to Delete</h4>
                  <p className="text-zinc-400 text-xs">Request deletion of your child's data by contacting doc@yourdomain.com. We will delete all data within a reasonable timeframe.</p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                  <h4 className="text-white font-bold text-sm mb-2">🚫 Right to Restrict</h4>
                  <p className="text-zinc-400 text-xs">Restrict further collection or use of your child's information. Your child's account will be limited accordingly.</p>
                </div>
              </div>
              <p className="text-zinc-300 mb-6">
                To exercise any of these rights, email us at{' '}
                <a href="mailto:doc@yourdomain.com" className="text-cyan-400 underline">doc@yourdomain.com</a>{' '}
                with your name, your child's username, and the action you request. We may need to verify your 
                identity before processing your request.
              </p>

              {/* SECTION 6 - Consent Verification */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">6. How Consent Verification Works</h2>
              <p className="text-zinc-300 mb-4">
                When a parent chooses to provide consent, we use one of the following methods, each 
                designed to minimize data retention while satisfying COPPA requirements:
              </p>
              <div className="space-y-4 mb-6">
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                  <h4 className="text-white font-bold text-sm mb-2">🎥 Video Chat Verification</h4>
                  <p className="text-zinc-400 text-xs">
                    A LiveKit video room is created where the parent speaks with our staff. The video call is 
                    NOT recorded — only a log entry recording that the verification occurred, the method used 
                    (video_chat), the date, and the time. No video or audio footage is stored.
                  </p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                  <h4 className="text-white font-bold text-sm mb-2">📝 Signed Consent Form</h4>
                  <p className="text-zinc-400 text-xs">
                    The parent downloads a consent form PDF, signs it, and returns it via email. Our staff 
                    reviews the form and logs the verification event. The signed form is retained securely for 
                    compliance purposes. <strong className="text-amber-400">Driver's license numbers or other government ID numbers are 
                    NEVER extracted or stored</strong> — the form only verifies parent identity through the email 
                    address and signature.
                  </p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                  <h4 className="text-white font-bold text-sm mb-2">💳 Credit Card Authorization</h4>
                  <p className="text-zinc-400 text-xs">
                    A $0.50 micro-transaction is processed via Stripe to verify the parent is a real adult 
                    with a valid payment method. The <strong className="text-amber-400">$0.50 is immediately refunded</strong>. 
                    We store ONLY the Stripe payment transaction ID for audit purposes — <strong className="text-amber-400">we NEVER store 
                    the full credit card number, CVV, or expiration date</strong>.
                  </p>
                </div>
              </div>

              {/* SECTION 7 - Audit Logging */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">7. Audit Trail & Data Retention</h2>
              <p className="text-zinc-300 mb-4">
                In compliance with Tennessee law, we maintain an immutable audit log of all age verification 
                and parental consent events. Each log entry records:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-4 list-disc list-inside">
                <li>The type of event (age gate denial, consent given, consent revoked, etc.)</li>
                <li>The verification method used (video chat, signed form, or credit card)</li>
                <li>The date and timestamp of the event</li>
                <li>A hashed identifier (not the actual name or email — encrypted, irreversible)</li>
                <li>The staff member who handled the verification (if applicable)</li>
              </ul>
              <p className="text-zinc-300 mb-6">
                <strong className="text-white">NOT stored in audit logs:</strong> Driver's license numbers, full credit card numbers, 
                addresses, or any personally identifiable information beyond a hashed reference.
              </p>
              <p className="text-zinc-300 mb-6">
                Account data is retained for as long as the account is active. Upon account deletion or 
                consent revocation, we delete all personally identifiable information within 30 days, 
                except where retention is required by law (e.g., audit logs, which exist without PII).
              </p>

              {/* SECTION 8 - Data Sharing */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">8. Data Sharing & Third Parties</h2>
              <p className="text-zinc-300 mb-4">
                We share information only in the following limited circumstances:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-6 list-disc list-inside">
                <li><strong className="text-white">Service Providers:</strong> We use trusted third-party services (Stripe for payments, 
                LiveKit for streaming, Cloudflare for CDN) that process data on our behalf. These providers 
                are contractually bound to protect your data and use it only for the services we request.</li>
                <li><strong className="text-white">Legal Compliance:</strong> We may disclose information if required by law, court order, 
                or government request, or to protect our rights, property, or safety.</li>
                <li><strong className="text-white">Public Content:</strong> Information you choose to share publicly on your profile or 
                in media uploads is visible to other users as directed by your privacy settings.</li>
              </ul>
              <p className="text-zinc-300 mb-6">
                <strong className="text-white">We do not sell, rent, or trade your personal information to third parties for their 
                marketing purposes.</strong>
              </p>

              {/* SECTION 9 - Security */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">9. Data Security</h2>
              <p className="text-zinc-300 mb-4">
                We implement industry-standard security measures to protect your information:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-6 list-disc list-inside">
                <li>🔐 All data transmitted over TLS/SSL encryption</li>
                <li>🔐 Passwords hashed using Argon2 or bcrypt (never stored in plaintext)</li>
                <li>🔐 Token-based authentication with JWT, short expiration times</li>
                <li>🔐 Regular security audits and dependency updates</li>
                <li>🔐 Access controls — only authorized personnel can access user data</li>
                <li>🔐 Cloudflare Turnstile anti-bot protection on registration forms</li>
              </ul>
              <p className="text-zinc-300 mb-6">
                While we take every reasonable precaution, no method of electronic storage or transmission 
                is 100% secure. We cannot guarantee absolute security but will notify you of any data breach 
                as required by applicable law.
              </p>

              {/* SECTION 10 - Cookies */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">10. Cookies & Tracking</h2>
              <p className="text-zinc-300 mb-4">
                We use only essential cookies necessary for the Platform to function:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-6 list-disc list-inside">
                <li>Authentication cookies (session management, login state)</li>
                <li>Security cookies (CSRF protection, anti-abuse measures)</li>
                <li>Functional cookies (remembering preferences)</li>
              </ul>
              <p className="text-zinc-300 mb-6">
                We do NOT use tracking cookies, advertising cookies, or third-party analytics cookies that 
                profile your behavior across websites. For more details, see our{' '}
                <Link href="/cookies" className="text-cyan-400 underline">Cookie Policy</Link>.
              </p>

              {/* SECTION 11 - Your Rights */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">11. Your Rights (All Users)</h2>
              <p className="text-zinc-300 mb-4">
                Depending on your jurisdiction, you may have the following rights regarding your personal 
                information:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-6 list-disc list-inside">
                <li><strong className="text-white">Access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong className="text-white">Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong className="text-white">Deletion:</strong> Request deletion of your personal information (subject to legal retention requirements)</li>
                <li><strong className="text-white">Portability:</strong> Request a machine-readable copy of your data</li>
                <li><strong className="text-white">Objection:</strong> Object to certain processing activities</li>
              </ul>
              <p className="text-zinc-300 mb-6">
                To exercise any of these rights, contact us at{' '}
                <a href="mailto:doc@yourdomain.com" className="text-cyan-400 underline">doc@yourdomain.com</a>. 
                We will respond within 30 days.
              </p>

              {/* SECTION 12 - Changes */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">12. Changes to This Policy</h2>
              <p className="text-zinc-300 mb-6">
                We may update this Privacy Policy from time to time. Material changes will be communicated 
                via email or through a notice on the Platform. The "Last Updated" date at the top of this 
                page reflects the most recent changes. We encourage you to review this policy periodically.
              </p>

              {/* SECTION 13 - Contact */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">13. Contact Information</h2>
              <p className="text-zinc-300 mb-4">
                If you have questions, concerns, or requests regarding this Privacy Policy, please contact us:
              </p>
              <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700 mb-6">
                <p className="text-zinc-300 mb-2">
                  <strong className="text-cyan-400">Email:</strong>{' '}
                  <a href="mailto:doc@yourdomain.com" className="text-cyan-400 hover:text-cyan-300 underline">doc@yourdomain.com</a>
                </p>
                <p className="text-zinc-300 mb-2">
                  <strong className="text-cyan-400">Platform:</strong>{' '}
                  <Link href="/contact" className="text-cyan-400 hover:text-cyan-300 underline">Contact Form</Link>
                </p>
                <p className="text-zinc-300 mb-2">
                  <strong className="text-cyan-400">Privacy Concerns:</strong>{' '}
                  <a href="mailto:privacy@yourdomain.com" className="text-cyan-400 hover:text-cyan-300 underline">privacy@yourdomain.com</a>
                </p>
                <p className="text-zinc-400 text-sm mt-3">
                  Don O'Connor Media<br />
                  Nashville, Tennessee<br />
                  United States
                </p>
              </div>
              <p className="text-zinc-500 text-sm mb-6">
                For COPPA-specific inquiries, please include "COPPA" in the subject line of your email so 
                we can prioritize your request.
              </p>

              {/* SECTION 14 - Tennessee Law */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">14. Tennessee Law Compliance</h2>
              <p className="text-zinc-300 mb-6">
                In compliance with Tennessee state law regarding data privacy and parental consent 
                verification:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-6 list-disc list-inside">
                <li>We do not retain copies of driver's licenses or government-issued identification</li>
                <li>We do not retain full credit card numbers — only payment transaction IDs for audit purposes</li>
                <li>We maintain a compliance log of verification events (method, date, time) without storing PII</li>
                <li>Parents may request a copy of the compliance log entries related to their child</li>
                <li>We comply with all applicable Tennessee data breach notification requirements</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 text-center space-y-4">
            <p className="text-zinc-500 text-sm">
              By using this Platform, you acknowledge that you have read and understood this Privacy Policy.
            </p>
            <div className="flex justify-center gap-4 text-sm">
              <Link href="/terms" className="text-cyan-400 hover:text-cyan-300 underline">Terms of Service</Link>
              <span className="text-zinc-600">|</span>
              <Link href="/cookies" className="text-cyan-400 hover:text-cyan-300 underline">Cookie Policy</Link>
              <span className="text-zinc-600">|</span>
              <Link href="/contact" className="text-cyan-400 hover:text-cyan-300 underline">Contact Us</Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
