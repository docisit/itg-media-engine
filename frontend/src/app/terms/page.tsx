'use client';
import Layout from '@/components/Layout';
import Link from 'next/link';

export default function TermsPage() {
  const lastUpdated = 'May 16, 2026';

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white py-16 px-4">
        <div className="max-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black mb-4">Terms of Service</h1>
            <p className="text-zinc-400 text-lg">Last updated: {lastUpdated}</p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <span className="px-3 py-1 bg-cyan-900/30 text-cyan-400 text-xs font-bold rounded-full border border-cyan-800/50">COPPA COMPLIANT</span>
              <span className="px-3 py-1 bg-amber-900/30 text-amber-400 text-xs font-bold rounded-full border border-amber-800/50">ASSUMPTION OF RISK</span>
            </div>
          </div>

          <div className="bg-zinc-900/50 rounded-2xl p-8 border border-zinc-800 space-y-8">
            <div className="prose prose-invert max-w-none">
              {/* SECTION 1 */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">1. Acceptance of Terms</h2>
              <p className="text-zinc-300 mb-4">
                By accessing, registering for, or using the IN THE GAME platform (the "Platform") operated by 
                Don O'Connor Media ("we," "us," "our"), you agree to be bound by these Terms of Service 
                ("Terms") and all applicable laws and regulations. If you do not agree, do not use the Platform.
              </p>
              <p className="text-zinc-300 mb-6">
                These Terms apply to all users, including athletes, coaches, recruiters, parents/guardians, 
                guests, and viewers. By creating an account or accessing any content on the Platform, 
                you accept these Terms in full.
              </p>

              {/* SECTION 2 - COPPA */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">2. Eligibility & COPPA Compliance</h2>
              <p className="text-zinc-300 mb-4">
                <strong className="text-white">Age Requirement:</strong> You must be at least 13 years of age to create an account 
                on the Platform. If you are under 13, you are strictly prohibited from registering or providing any 
                personal information without verifiable parental consent.
              </p>
              <p className="text-zinc-300 mb-4">
                <strong className="text-white">Parental Consent:</strong> In compliance with the Children's Online Privacy Protection Act 
                (COPPA), users under 13 must obtain verifiable parental consent through one of the following 
                FTC-approved methods before any personal data is collected:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-4 list-disc list-inside">
                <li>Video chat verification with our staff</li>
                <li>A signed parental consent form returned via email or mail</li>
                <li>A credit card authorization micro-transaction ($0.50, fully refunded)</li>
              </ul>
              <p className="text-zinc-300 mb-6">
                <strong className="text-white">Zero Data Before Consent:</strong> We do not collect, store, or process any 
                personal information from users who indicate they are under 13 until verifiable parental consent 
                has been obtained. Parents may revoke consent and request deletion of their child's data at any time.
              </p>

              {/* SECTION 3 - Liability Waiver (CRITICAL for Max Lifts) */}
              <h2 className="text-2xl font-bold mb-4 text-amber-400">3. Assumption of Risk & Liability Waiver</h2>
              <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-bold text-amber-300 mb-3">⚠️ IMPORTANT: PHYSICAL ACTIVITY WARNING</h3>
                <p className="text-zinc-300 mb-4">
                  <strong className="text-amber-200">YOU ASSUME ALL RISK.</strong> The Platform facilitates the sharing of athletic drills, 
                  workouts, max lift attempts, agility training, conditioning exercises, and other physical activities 
                  ("Athletic Content"). BY USING THIS PLATFORM, YOU ACKNOWLEDGE AND AGREE THAT:
                </p>
                <ul className="text-zinc-300 space-y-2 mb-4 list-disc list-inside">
                  <li>Participation in any physical activity — including but not limited to weightlifting, 
                  sprinting, jumping, stretching, and sport-specific drills — carries inherent risk of 
                  serious injury, including but not limited to muscle strains, ligament tears, fractures, 
                  head trauma, cardiac events, and in rare cases, death.</li>
                  <li>You should consult with a licensed medical professional before attempting any 
                  Athletic Content shown, demonstrated, or described on the Platform.</li>
                  <li>We are not a medical, physical therapy, or personal training service. No content on 
                  the Platform constitutes medical advice, physical therapy prescription, or professional 
                  training guidance.</li>
                  <li>You are solely responsible for your own safety, including using proper form, 
                  appropriate weight loads, adequate warm-up, proper equipment, and knowing your personal 
                  physical limitations.</li>
                  <li>Max lift attempts (one-rep max, PR attempts, or any form of maximal lifting) carry 
                  significantly elevated risk of injury. By posting, viewing, or attempting any max lift 
                  content, you accept full responsibility for any injury that may occur.</li>
                  <li>Minors attempting any Athletic Content must do so under the direct supervision of a 
                  qualified adult coach, trainer, or parent/guardian.</li>
                </ul>
                <p className="text-zinc-300">
                  <strong className="text-red-400">TO THE FULLEST EXTENT PERMITTED BY LAW, DON O'CONNOR MEDIA, ITS OFFICERS, 
                  DIRECTORS, EMPLOYEES, AND AFFILIATES ARE NOT LIABLE FOR ANY INJURY, LOSS, OR DAMAGE 
                  ARISING FROM YOUR PARTICIPATION IN ANY PHYSICAL ACTIVITY REFERENCED, DEMONSTRATED, OR 
                  PROMOTED ON THE PLATFORM.</strong>
                </p>
              </div>

              {/* SECTION 4 - Service Description */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">4. Service Description</h2>
              <p className="text-zinc-300 mb-4">
                IN THE GAME is a sports media platform that provides:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-6 list-disc list-inside">
                <li>Livestream broadcasts and recorded shows featuring athletes, coaches, and sports personalities</li>
                <li>Athlete profiles with stats, achievements, and video highlights (athletic drills and performances only)</li>
                <li>Drill library for coaches and athletes to share sport-specific training content</li>
                <li>Rankings and leaderboard systems for verified athletic statistics</li>
                <li>Guest appearances via LiveKit WebRTC and WHIP/RTMP streaming</li>
                <li>Content moderation to ensure all shared content is sports-related and appropriate</li>
              </ul>

              {/* SECTION 5 - Content Rules */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">5. Acceptable Content & Community Guidelines</h2>
              <p className="text-zinc-300 mb-4">
                The Platform is strictly for athletic and sports-related content. All users agree to the 
                following content standards:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-6 list-disc list-inside">
                <li><strong className="text-emerald-400">✅ ALLOWED:</strong> Athletic drills, workout videos, game highlights, 
                sports analysis, training tips, sports interviews, athletic stats, and related sports content.</li>
                <li><strong className="text-red-400">❌ PROHIBITED:</strong> Profanity, explicit content, harassment, hate speech, 
                bullying, threats, nudity, violence (beyond normal sports contact), illegal activities, 
                medical advice, political campaigning, commercial advertising without permission, and 
                any content that is not sports-related.</li>
              </ul>
              <p className="text-zinc-300 mb-6">
                Violation of these guidelines may result in content removal, account suspension, or permanent 
                ban at our sole discretion. We reserve the right to moderate all content and report illegal 
                activity to appropriate authorities.
              </p>

              {/* SECTION 6 - User Reporting */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">6. User Reporting & Content Moderation</h2>
              <p className="text-zinc-300 mb-4">
                We provide a user reporting system for flagging content that violates these Terms. 
                Reports can be filed through the Platform for the following reasons:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-6 list-disc list-inside">
                <li>Inappropriate or non-sports content</li>
                <li>Suspected underage user without parental consent</li>
                <li>Harassment or bullying</li>
                <li>Content that encourages unsafe physical activity</li>
                <li>Any other violation of these Terms</li>
              </ul>
              <p className="text-zinc-300 mb-6">
                Our moderation team reviews all reports and takes appropriate action, which may include 
                content removal, account warnings, suspensions, or permanent bans.
              </p>

              {/* SECTION 7 - Account */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">7. User Accounts & Responsibilities</h2>
              <p className="text-zinc-300 mb-4">
                You are responsible for maintaining the confidentiality of your account credentials and 
                for all activities that occur under your account. You agree to:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-6 list-disc list-inside">
                <li>Provide accurate and truthful information during registration</li>
                <li>Not create accounts using automated methods or for malicious purposes</li>
                <li>Not impersonate any person or entity</li>
                <li>Not use the Platform for any illegal or unauthorized purpose</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>

              {/* SECTION 8 - Content Ownership */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">8. Content Ownership & License</h2>
              <p className="text-zinc-300 mb-4">
                <strong className="text-white">Your Content:</strong> You retain ownership of all content you submit to the Platform 
                (your "Content"). By submitting Content, you grant Don O'Connor Media a non-exclusive, 
                royalty-free, worldwide license to display, broadcast, distribute, and promote your Content 
                on the Platform and related promotional materials.
              </p>
              <p className="text-zinc-300 mb-4">
                <strong className="text-white">Platform Content:</strong> All content owned by Don O'Connor Media, including show 
                recordings, branding, logos, and original productions, is protected by copyright and other 
                intellectual property laws.
              </p>
              <p className="text-zinc-300 mb-6">
                <strong className="text-white">Media Uploads:</strong> By uploading video, images, or other media, you represent 
                that you have the legal right to share such content and that it does not infringe on any 
                third-party rights.
              </p>

              {/* SECTION 9 - Privacy */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">9. Privacy & Data Protection</h2>
              <p className="text-zinc-300 mb-6">
                Our data collection and handling practices are described in our{' '}
                <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300 underline">Privacy Policy</Link>. 
                By using the Platform, you consent to the collection and use of your information as described 
                therein. Key highlights include:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-6 list-disc list-inside">
                <li>We collect only athletic-related information and account essentials</li>
                <li>We never store driver's licenses or full credit card numbers</li>
                <li>Under-13 users require parental consent before any data collection</li>
                <li>Parents may review, update, or delete their child's data at any time</li>
                <li>We do not sell personal information to third parties</li>
              </ul>

              {/* SECTION 10 - Technical */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">10. Technical Requirements & Service Availability</h2>
              <p className="text-zinc-300 mb-4">
                Users are responsible for maintaining adequate internet connectivity and compatible equipment 
                for live streaming, video calls, and content uploads. We provide technical support but:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-6 list-disc list-inside">
                <li>Cannot guarantee uninterrupted service due to internet variability</li>
                <li>Are not responsible for third-party service disruptions (CDN, cloud providers, etc.)</li>
                <li>Reserve the right to perform maintenance that may temporarily affect availability</li>
                <li>May modify or discontinue features at our discretion with reasonable notice</li>
              </ul>

              {/* SECTION 11 - Limitation of Liability (Comprehensive) */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">11. Limitation of Liability</h2>
              <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-6 mb-6">
                <p className="text-zinc-300 mb-4">
                  <strong className="text-red-300">TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:</strong>
                </p>
                <ul className="text-zinc-300 space-y-3 mb-4 list-disc list-inside">
                  <li>Don O'Connor Media shall not be liable for any indirect, incidental, special, 
                  consequential, or punitive damages arising from or related to your use of the Platform.</li>
                  <li>Our total liability for any claim arising from these Terms or the Platform shall not exceed 
                  the amount you have paid us in the preceding 12 months.</li>
                  <li>We are not liable for: (a) personal injury from physical activities, (b) content posted by 
                  other users, (c) data loss or corruption, (d) unauthorized access to your account, 
                  (e) third-party services integrated with the Platform.</li>
                  <li>This limitation of liability applies whether the claim is based on warranty, contract, 
                  tort (including negligence), or any other legal theory.</li>
                </ul>
              </div>

              {/* SECTION 12 - Indemnification */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">12. Indemnification</h2>
              <p className="text-zinc-300 mb-6">
                You agree to indemnify, defend, and hold harmless Don O'Connor Media, its officers, directors, 
                employees, agents, and affiliates from and against any claims, liabilities, damages, losses, 
                and expenses (including reasonable legal fees) arising from: (a) your use of the Platform, 
                (b) your Content, (c) your violation of these Terms, (d) your violation of any third-party 
                rights, or (e) any injury resulting from your participation in physical activities promoted 
                or demonstrated on the Platform.
              </p>

              {/* SECTION 13 - Termination */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">13. Termination & Account Suspension</h2>
              <p className="text-zinc-300 mb-4">
                We reserve the right to suspend or terminate accounts at our sole discretion, including 
                without limitation for:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-6 list-disc list-inside">
                <li>Violation of these Terms or Community Guidelines</li>
                <li>Content that is illegal, harmful, or non-sports-related</li>
                <li>Harassment, threats, or abusive behavior toward other users or staff</li>
                <li>Impersonation or fraudulent activity</li>
                <li>Extended inactivity</li>
              </ul>
              <p className="text-zinc-300 mb-6">
                Upon termination, your right to use the Platform ceases immediately. We may retain certain 
                data as required by law or for legitimate business purposes.
              </p>

              {/* SECTION 14 - COPPA Data Deletion */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">14. Parental Rights Under COPPA</h2>
              <p className="text-zinc-300 mb-4">
                If you are a parent or legal guardian of a user under 13 on our Platform, you have the 
                following rights:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-6 list-disc list-inside">
                <li><strong className="text-white">Review:</strong> Request to review the personal information we have collected about your child</li>
                <li><strong className="text-white">Revoke Consent:</strong> Revoke your consent at any time via the consent link sent to your email</li>
                <li><strong className="text-white">Deletion:</strong> Request deletion of your child's data by contacting us at doc@yourdomain.com</li>
                <li><strong className="text-white">Restriction:</strong> Restrict further collection or use of your child's information</li>
              </ul>
              <p className="text-zinc-300 mb-6">
                We will respond to parental rights requests within a reasonable time and no later than 
                30 days from receipt of a verified request.
              </p>

              {/* SECTION 15 - Governing Law */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">15. Governing Law & Dispute Resolution</h2>
              <p className="text-zinc-300 mb-4">
                These Terms are governed by the laws of the State of Tennessee, United States, without 
                regard to its conflict of law principles. Any disputes arising from these Terms shall be 
                resolved through binding arbitration in Davidson County, Tennessee, except that either 
                party may seek injunctive relief in any court of competent jurisdiction.
              </p>
              <p className="text-zinc-300 mb-6">
                <strong className="text-white">Class Action Waiver:</strong> All claims must be brought in an individual capacity 
                and not as a plaintiff or class member in any purported class action or representative proceeding.
              </p>

              {/* SECTION 16 - Modifications */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">16. Modifications to Terms</h2>
              <p className="text-zinc-300 mb-6">
                We reserve the right to modify these Terms at any time. Material changes will be communicated 
                via email or through the Platform. Continued use of the Platform after changes constitutes 
                acceptance of the updated Terms. If you do not agree with modifications, you must stop using 
                the Platform.
              </p>

              {/* SECTION 17 - Severability */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">17. Severability</h2>
              <p className="text-zinc-300 mb-6">
                If any provision of these Terms is found to be unenforceable or invalid by a court of 
                competent jurisdiction, that provision shall be limited or eliminated to the minimum extent 
                necessary, and the remaining provisions shall remain in full force and effect.
              </p>

              {/* SECTION 18 - Contact */}
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">18. Contact Information</h2>
              <p className="text-zinc-300 mb-4">
                For questions about these Terms, please contact us:
              </p>
              <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700 mb-6">
                <p className="text-zinc-300">
                  <strong className="text-cyan-400">Email:</strong>{' '}
                  <a href="mailto:doc@yourdomain.com" className="text-cyan-400 hover:text-cyan-300 underline">doc@yourdomain.com</a>
                </p>
                <p className="text-zinc-300">
                  <strong className="text-cyan-400">Platform:</strong>{' '}
                  <Link href="/contact" className="text-cyan-400 hover:text-cyan-300 underline">Contact Form</Link>
                </p>
                <p className="text-zinc-400 text-sm mt-3">
                  Don O'Connor Media<br />
                  Nashville, Tennessee<br />
                  United States
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center space-y-4">
            <p className="text-zinc-500 text-sm">
              By using this Platform, you acknowledge that you have read, understood, and agree to be 
              bound by these Terms of Service.
            </p>
            <div className="flex justify-center gap-4 text-sm">
              <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300 underline">Privacy Policy</Link>
              <span className="text-zinc-600">|</span>
              <Link href="/contact" className="text-cyan-400 hover:text-cyan-300 underline">Contact Us</Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
