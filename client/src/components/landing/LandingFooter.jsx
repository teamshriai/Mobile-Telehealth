import { Link } from 'react-router-dom'
import { Video, ShieldCheck, Mail, Phone } from 'lucide-react'

export default function LandingFooter() {
  return (
    <footer className="bg-slate-900 text-white font-sans border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 pb-12 border-b border-slate-800">
          
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Video size={18} />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">CareFlow Telehealth</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Providing patients with seamless, encrypted virtual video consultations, medical report tracking, and specialized oncology care.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>HIPAA Compliant Patient Platform</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Platform</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#services" className="hover:text-white transition-colors">Services</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#doctors" className="hover:text-white transition-colors">Specialists</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>

          {/* Patient Account */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Patient Account</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Register Account</Link></li>
              <li><Link to="/forgot-password" className="hover:text-white transition-colors">Forgot Password</Link></li>
            </ul>
          </div>

          {/* Contact Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Contact Support</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-blue-400" />
                <span>support@telehealth-care.org</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-blue-400" />
                <span>+1 (800) 555-CARE</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} CareFlow Telehealth Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Security Overview</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
