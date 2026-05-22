import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, HelpCircle, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { cn } from '@/src/lib/utils';

export const FAQ: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const [activeTab, setActiveTab] = React.useState<'user' | 'worker'>('user');
  const [openIdx, setOpenIdx] = React.useState<number | null>(null);

  // Clear open index when switching tabs
  React.useEffect(() => {
    setOpenIdx(null);
  }, [activeTab]);

  const userFaqs = [
    {
      q: "How do I book a professional or rental service?",
      a: "You can browse categories (like Cleaning, Painting, or Rentals) directly from your Home Dashboard. Tap on a professional's profile to see their rates, ratings, and experience. Click \"Quick Book\" to send them a service request with your preferred date and time.",
      qTa: "நான் எப்படி ஒரு தொழில்முறை நபர் அல்லது வாடகை சேவையை பதிவு செய்வது?",
      aTa: "உங்கள் Home Dashboard-இல் உள்ள Cleaning, Painting அல்லது Rentals போன்ற பிரிவுகளை நேரடியாக பார்க்கலாம். ஒரு தொழில்முறை நபரின் profile-ஐத் திறந்து அவர்களின் கட்டணம், மதிப்பீடு (ratings), அனுபவம் ஆகியவற்றைப் பார்க்கலாம். “Quick Book” என்பதை அழுத்தி, நீங்கள் விரும்பும் தேதி மற்றும் நேரத்துடன் சேவை கோரிக்கையை அனுப்பலாம்."
    },
    {
      q: "How is the final price of the service decided?",
      a: "When booking, you simply select from the professional's fixed service rates (like 'Quick Visit' or 'Rate per Hour'). The worker will see your request with this fixed price and can accept it immediately or reject it with a reason.",
      qTa: "சேவையின் இறுதி விலை எப்படி நிர்ணயிக்கப்படுகிறது?",
      aTa: "பதிவு செய்யும்போது, தொழில்முறை நபர் வழங்கியுள்ள நிலையான சேவை கட்டணங்களில் (உதா: ‘Quick Visit’, ‘Rate per Hour’) ஒன்றை நீங்கள் தேர்வு செய்ய வேண்டும். அவர் உங்கள் கோரிக்கையை அந்த விலையுடன் பார்த்து உடனே ஏற்கலாம் அல்லது காரணத்துடன் நிராகரிக்கலாம்."
    },
    {
      q: "Can I cancel my service request after submitting it?",
      a: "Yes, you can cancel your request completely free of charge before the professional accepts it. However, if you choose to cancel the booking after the professional has already accepted the job, a small fixed ₹10 Cancellation Penalty will be applied to your account.",
      qTa: "நான் அனுப்பிய சேவை கோரிக்கையை ரத்து செய்ய முடியுமா?",
      aTa: "ஆம், தொழில்முறை நபர் அதை ஏற்கும் முன் நீங்கள் இலவசமாக ரத்து செய்யலாம். ஆனால் அவர் ஏற்கப்பட்ட பிறகு நீங்கள் ரத்து செய்தால், ₹10 அபராதம் விதிக்கப்படும்."
    },
    {
      q: "How much is the Cancellation Penalty if I cancel an accepted job?",
      a: "To compensate the professional for their blocked time, a fixed flat fine of exactly ₹10 is applied to your portal when you cancel a booking that has already been confirmed and accepted.",
      qTa: "ஏற்கப்பட்ட சேவையை ரத்து செய்தால் எவ்வளவு அபராதம்?",
      aTa: "தொழில்முறை நபரின் நேர இழப்பை கருத்தில் கொண்டு, நீங்கள் ஏற்கப்பட்ட சேவையை ரத்து செய்தால் ₹10 என்ற நிரந்தர அபராதம் விதிக்கப்படும்."
    },
    {
      q: "How do I clear my outstanding ₹10 Cancellation Penalty?",
      a: "Navigate to the \"Cancellation Fee\" page from your profile menu. Click \"Pay Outstanding\" to transfer the amount via UPI. After paying, click \"Confirm Payment\" in the app, and an admin will wipe your dues clean.",
      qTa: "இந்த ₹10 அபராதத்தை எப்படி செலுத்துவது?",
      aTa: "உங்கள் profile menu-இல் உள்ள “Cancellation Fee” பக்கத்துக்கு செல்லவும். அங்கு “Pay Outstanding” என்பதை அழுத்தி UPI மூலம் கட்டணம் செலுத்தலாம். பின்னர் “Confirm Payment” அழுத்தினால் Admin நிலுவையை நீக்குவார்."
    },
    {
      q: "What happens if I ignore my pending penalty fees?",
      a: "If you don't pay the ₹10 fine within 6 days, your account will show a red \"Overdue\" warning. You won't be allowed to book any new services until you pay this fine.",
      qTa: "அபராதத்தை செலுத்தாமல் விட்டால் என்ன ஆகும்?",
      aTa: "₹10 அபராதத்தை 6 நாட்களுக்குள் செலுத்தவில்லை என்றால், உங்கள் account-இல் “Overdue” என்ற எச்சரிக்கை காணப்படும். அதுவரை புதிய சேவைகளை பதிவு செய்ய முடியாது."
    },
    {
      q: "Can I message the professional before they arrive at my house?",
      a: "Yes! As soon as the professional accepts your booking, you can call them directly to give directions and explain your request.",
      qTa: "தொழில்முறை நபரை அவர் வருவதற்கு முன் தொடர்பு கொள்ள முடியுமா?",
      aTa: "ஆம்! அவர் உங்கள் கோரிக்கையை ஏற்றவுடன், நீங்கள் அவருக்கு நேரடியாக call செய்து பேசலாம்."
    },
    {
      q: "How do I pay the professional once the job is done?",
      a: "The app just connects you with the worker. When the job is done, you give the money directly to the worker yourself (Cash or UPI). The app does not handle this payment.",
      qTa: "வேலை முடிந்ததும் பணம் எப்படி செலுத்த வேண்டும்?",
      aTa: "இந்த app உங்களை தொழில்முறை நபருடன் இணைக்கிறது மட்டும். வேலை முடிந்ததும், பணத்தை நேரடியாக அவருக்கே நீங்கள் கொடுக்க வேண்டும் (ரொக்கமாகவோ அல்லது UPI மூலமாகவோ)."
    },
    {
      q: "Can I rate the professional after the job is finished?",
      a: "Yes! Once the service is marked as \"Completed,\" you can go to your Booking History and leave a 1 to 5-star rating for the worker. Your rating helps others find the best professionals!",
      qTa: "சேவை முடிந்த பிறகு நான் மதிப்பீடு (rating) செய்ய முடியுமா?",
      aTa: "ஆம்! சேவை “Completed” ஆன பிறகு, உங்கள் Booking History-க்கு சென்று 1 முதல் 5 நட்சத்திரம் வரை rating கொடுக்கலாம்."
    },
    {
      q: "What if I have an issue with the app or need help?",
      a: "You can use the \"Chat with Admin\" option in your profile or the Chat icon on the dashboard to message our support team directly. We are always here to help!",
      qTa: "எனக்கு உதவி தேவைப்பட்டால் என்ன செய்ய வேண்டும்?",
      aTa: "உங்கள் profile-இல் உள்ள “Chat with Admin” அல்லது dashboard-இல் உள்ள Chat icon-ஐ பயன்படுத்தி Admin-க்கு நேரடியாக message அனுப்பலாம்."
    }
  ];

  const workerFaqs = [
    {
      q: "How do I register as a service provider on the app?",
      a: "Go to the Profile page and click \"Switch to Worker.\" In the service profile You will need to select your trade (like Electrician or Plumber), image, set your working rates, and provide your experience details. Once submitted, our Admin will verify your profile.",
      qTa: "நான் எப்படி ஒரு சேவை வழங்குநராக (Service Provider) பதிவு செய்வது?",
      aTa: "Profile page-க்கு சென்று “Switch to Worker” என்பதை கிளிக் செய்யவும். Service Profile-இல் உங்கள் தொழிலை (உதா: Electrician, Plumber), உங்கள் படம் (image), சேவை கட்டணம் (rates), மற்றும் அனுபவ விவரங்களை நிரப்ப வேண்டும். அனைத்தையும் சமர்ப்பித்த பிறகு, Admin உங்கள் profile-ஐ சரிபாரிப்பார்."
    },
    {
      q: "How do I know if I have a new job request?",
      a: "You will receive a real-time notification on your phone. You can also check the \"Job Requests\" section on your Worker Dashboard to see all pending, accepted, and completed orders.",
      qTa: "புதிய வேலை கோரிக்கை வந்ததை நான் எப்படி தெரிந்து கொள்வது?",
      aTa: "உங்கள் மொபைலில் real-time notification வரும். மேலும், Worker Dashboard-இல் உள்ள “Job Requests” பகுதியில் pending, accepted, completed ஆகிய அனைத்து வேலைகளையும் பார்க்கலாம்."
    },
    {
      q: "How much is the Platform Fee I need to pay?",
      a: "The platform fee is calculated based on your service category as follows: 10% Fee: Auto, Tempo, Van, and Car services. 50% Fee: Coconut Plucker services. 5% Fee: JCB, House Rent, and Shop Rent services. 0% (FREE): Marriage Hall and Catering services. 3% Fee (Standard): Painter, Plumber, Electrician, Carpenter, Mason, Cleaner, TV Repair, Tiles Worker, Welder, Mechanic, and Cable services. This fee is automatically calculated based on the final booking amount once the job is marked as completed.",
      qTa: "நான் செலுத்த வேண்டிய Platform Fee எவ்வளவு?",
      aTa: "உங்கள் சேவை வகையைப் பொறுத்து Platform Fee கணக்கிடப்படும்: 10% கட்டணம்: Auto, Tempo, Van, Car சேவைகள் | 50% கட்டணம்: Coconut Plucker சேவைகள் | 5% கட்டணம்: JCB, House Rent, Shop Rent | 0% (இலவசம்): Marriage Hall, Catering | 3% கட்டணம்: Painter, Plumber, Electrician, Carpenter, Mason, Cleaner, TV Repair, Tiles Worker, Welder, Mechanic, Cable. இந்த கட்டணம், வேலை Completed ஆன பிறகு இறுதி தொகையை அடிப்படையாக கொண்டு தானாக கணக்கிடப்படும்."
    },
    {
      q: "How do I pay my platform fees to the admin?",
      a: "Go to the \"My Earnings\" section in your profile. You will see your balance. Click \"Pay Now,\" transfer the amount via official UPI, and click \"Confirm Payment.\" The admin will verify and clear your balance.",
      qTa: "Platform Fee-ஐ Admin-க்கு எப்படி செலுத்துவது?",
      aTa: "Profile-இல் உள்ள “My Earnings” பகுதியில் உங்கள் நிலுவை தொகையை பார்க்கலாம். “Pay Now” என்பதை கிளிக் செய்து UPI மூலம் பணம் செலுத்தவும். பின்னர் “Confirm Payment” அழுத்தினால் Admin சரிபார்த்து உங்கள் நிலுவையை நீக்குவார்."
    },
    {
      q: "What happens if I don't pay my platform fees on time?",
      a: "If you have unpaid fees past their due date, your account will be marked as \"Overdue.\" You will be temporarily blocked from accepting new job requests until the balance is cleared.",
      qTa: "Platform Fee-ஐ நேரத்தில் செலுத்தவில்லை என்றால் என்ன ஆகும்?",
      aTa: "Due date-ஐ கடந்தும் கட்டணம் செலுத்தப்படவில்லை என்றால், உங்கள் account “Overdue” என குறிக்கப்படும். இதனால், புதிய வேலை கோரிக்கைகளை ஏற்க முடியாது."
    },
    {
      q: "Can I reject a job request if I am busy?",
      a: "Yes, you can reject a request if you are unavailable. Please provide a clear reason for the rejection so the customer understands why you cannot attend to the job.",
      qTa: "நான் பிஸியாக இருந்தால் ஒரு வேலை கோரிக்கையை நிராகரிக்கலாமா?",
      aTa: "ஆம், நீங்கள் கிடைக்கவில்லை என்றால் நிராகரிக்கலாம். ஆனால், ஏன் நிராகரிக்கிறீர்கள் என்பதை தெளிவாக காரணத்துடன் குறிப்பிட வேண்டும்."
    },
    {
      q: "Is there a penalty if I cancel a job after accepting it?",
      a: "Yes. If you cancel a job after accepting it, a cancellation penalty of 25% of the platform commission will be added to your account.",
      qTa: "ஏற்கப்பட்ட வேலைவை ரத்து செய்தால் அபராதம் உள்ளதா?",
      aTa: "ஆம். நீங்கள் ஏற்கப்பட்ட வேலைவை ரத்து செய்தால், Platform Commission-இன் 25% அபராதமாக உங்கள் account-இல் சேர்க்கப்படும்."
    },
    {
      q: "How do I receive my payment from the customer?",
      a: "You collect the payment directly from the customer at the site via Cash, UPI, or any method you both agree upon. The app does not handle, track, or process this money.",
      qTa: "வாடிக்கையாளரிடமிருந்து பணத்தை எப்படி பெறுவது?",
      aTa: "வேலை முடிந்ததும், நீங்கள் நேரடியாக வாடிக்கையாளரிடமிருந்து Cash, UPI அல்லது நீங்கள் இருவரும் ஒப்புக்கொண்ட எந்த முறையிலும் பணத்தை பெறலாம். App இந்த பணத்தை நிர்வகிக்காது."
    },
    {
      q: "How can I change my service rates or location?",
      a: "Go to \"Service Profile\" in your profile settings. Here you can update your per-hour/day rates, change your location, and update your working hours.",
      qTa: "என் சேவை கட்டணம் அல்லது இடத்தை எப்படி மாற்றுவது?",
      aTa: "Profile settings-இல் உள்ள “Service Profile” பகுதிக்கு சென்று உங்கள் hourly/day rates, location, மற்றும் working hours-ஐ மாற்றலாம்."
    },
    {
      q: "How can I contact the customer after accepting a job?",
      a: "Once you accept a job, the customer's phone number will be visible. You can call them directly or use the in-app chat feature to discuss directions and job details.",
      qTa: "வேலை ஏற்ற பிறகு வாடிக்கையாளரை எப்படி தொடர்பு கொள்வது?",
      aTa: "நீங்கள் வேலை ஏற்றவுடன் வாடிக்கையாளரின் phone number காணப்படும். அவர்களை நேரடியாக call செய்யலாம் அல்லது app-இல் உள்ள chat மூலம் விவரங்களை பேசலாம்."
    }
  ];

  const currentFaqs = activeTab === 'user' ? userFaqs : workerFaqs;

  return (
    <div className="flex flex-col min-h-full bg-slate-50/30">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-8 px-6 rounded-b-[2.5rem] shadow-2xl shadow-blue-200/40">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
        <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 bg-white/10 text-white/90 hover:text-white backdrop-blur-md border border-white/20 rounded-xl transition-all active:scale-90"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-[10px] font-black text-white/70 tracking-[0.3em] uppercase">{t('Help Center')}</h1>
          <div className="w-8" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-2xl rounded-2xl flex items-center justify-center border border-white/30 shadow-2xl mb-3">
             <HelpCircle size={28} className="text-white drop-shadow-lg" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tighter">{t('FAQ')}</h2>
        </div>

        {/* Tab Switcher */}
        <div className="relative z-10 mt-8 flex p-1.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
          <button 
            onClick={() => setActiveTab('user')}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
              activeTab === 'user' ? "bg-white text-blue-700 shadow-xl" : "text-white/70 hover:text-white"
            )}
          >
            {t('For Users')}
          </button>
          <button 
            onClick={() => setActiveTab('worker')}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
              activeTab === 'worker' ? "bg-white text-blue-700 shadow-xl" : "text-white/70 hover:text-white"
            )}
          >
            {t('For Professionals')}
          </button>
        </div>
      </div>

      <motion.div 
        key={activeTab}
        className="px-6 py-10 pb-32 space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {currentFaqs.map((faq, idx) => {
          const isOpen = openIdx === idx;

          return (
            <motion.div 
              key={idx} 
              variants={itemVariants}
              className="group"
            >
              <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white shadow-xl shadow-blue-500/5 overflow-hidden transition-all duration-300 group-hover:shadow-blue-500/10">
                <button 
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-7 text-left gap-4"
                >
                  <div className="flex-1 pr-2">
                    <h3 className="text-[13px] font-black text-slate-900 leading-tight uppercase tracking-tight">{faq.q}</h3>
                    <p className="text-[11px] font-bold text-blue-600/60 mt-2">{faq.qTa}</p>
                  </div>
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 shrink-0",
                    isOpen ? "bg-blue-600 text-white shadow-lg rotate-180" : "bg-blue-50 text-blue-600 group-hover:bg-blue-100"
                  )}>
                    <ChevronDown size={20} />
                  </div>
                </button>
                
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="px-7 pb-8 pt-2">
                         <div className="h-px w-full bg-slate-100 mb-6" />
                         <div className="space-y-6">
                            <div className="flex gap-4 items-start">
                               <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs shrink-0 mt-1">A</div>
                               <p className="text-sm text-slate-600 font-bold leading-relaxed">
                                 {faq.a}
                               </p>
                            </div>
                            <div className="flex gap-4 items-start bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100/50">
                               <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 mt-1">ப</div>
                               <p className="text-[13px] text-blue-900 font-bold leading-relaxed">
                                 {faq.aTa}
                               </p>
                            </div>
                         </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};
