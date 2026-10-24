import { photos, type Photo } from "./images";

// Everything a visitor reads lives here. Keep it to facts about the library.

export const site = {
  name: "Ekagra Library",
  fullName: "Ekagra Library",
  marathiName: "एकाग्र अभ्यासिका",
  description:
    "A peaceful study library in Lohegaon, Pune for MPSC, UPSC, NEET, JEE and every competitive exam. Open 8 am to 9 pm. Reserve your desk or sit anywhere.",
  area: "Lohegaon",
  city: "Pune",
  address: ["Royal Heights, Sr. No. 285, 3/4", "Porwal Sathe Wasti Road, opposite Gini Bellina", "Kutwal Colony, Lohegaon, Pune 411047"],
  directionsUrl: "https://www.google.com/maps/search/?api=1&query=18.6019402,73.9125204",
  phone: "+91 70578 89881",
  phoneHref: "tel:+917057889881",
  whatsappHref: "https://wa.me/917057889881",
  seats: 60, // TODO: total desks, used by the admin dashboard
  copyrightYear: 2026,
  hours: "8:00 am to 9:00 pm",
};

export const nav = [
  { href: "/#facilities", label: "Facilities" },
  { href: "/#the-day", label: "The day" },
  { href: "/gallery", label: "Gallery" },
  { href: "/#visit", label: "Visit" },
];

export const exams = ["MPSC", "UPSC", "NEET", "JEE", "and every other competitive exam"];

export const statement =
  "Everyone at these desks is preparing for something big. MPSC, UPSC, NEET, JEE. The hall stays peaceful while you study, and between sessions the people around you become friends. A library that feels like a big family.";

export const amenities: { title: string; body: string }[] = [
  { title: "A peaceful atmosphere", body: "A quiet hall where you can study for hours without distraction." },
  { title: "Reserve a desk, or sit anywhere", body: "Keep the same desk every day, or take any free seat when you arrive." },
  { title: "Wi-Fi", body: "For online lectures, mock tests and notes." },
  { title: "CCTV cameras", body: "The library is watched by CCTV cameras." },
  { title: "Separate washrooms", body: "Separate toilets and bathrooms for men and women." },
  { title: "Parking", body: "Parking is available at the library." },
  { title: "A big family", body: "Study together, take breaks together, and make friends who are on the same path." },
];

export type DayMoment = { time: string; period: "am" | "pm"; title: string; body: string; photo: Photo };

export const day: DayMoment[] = [
  { time: "8:00", period: "am", title: "Doors open", body: "The hall opens and the first desks fill up.", photo: photos.lampPullChain },
  { time: "10:00", period: "am", title: "The long stretch", body: "The quietest hours of the day. Heads down, pages turning.", photo: photos.aspirantsStudying },
  { time: "1:30", period: "pm", title: "A break together", body: "Step out, eat, talk through a tough topic with friends. Then back to the desk.", photo: photos.newspaperCorner },
  { time: "5:00", period: "pm", title: "Revision light", body: "Late sun through the windows. Answer writing and revision.", photo: photos.archedWindows },
  { time: "7:00", period: "pm", title: "The evening push", body: "The last hours, when the day’s targets get finished.", photo: photos.bankersLamp },
  { time: "9:00", period: "pm", title: "Closing time", body: "The hall closes. Same desk, same time tomorrow.", photo: photos.domedRoom },
];

export const faqs: { q: string; a: string }[] = [
  { q: "What are the timings?", a: `We’re open from ${site.hours}.` },
  { q: "Can I reserve a desk?", a: "Yes. Reserve your own desk and keep it every day, or skip the reservation and sit at any free seat." },
  { q: "Which exams do students here prepare for?", a: "MPSC, UPSC, NEET, JEE and every other competitive exam." },
  { q: "Is it safe?", a: "The library has CCTV cameras, and separate toilets and bathrooms for men and women." },
  { q: "Is there Wi-Fi and parking?", a: "Yes, both." },
  { q: "How do I join?", a: `Visit us, call ${site.phone}, or send an enquiry using the form below and we’ll call you back.` },
];
