import { photos, type Photo } from "./images";

// Everything a visitor reads lives here. Keep it to facts about the library.

export const site = {
  name: "Ekagra Library",
  fullName: "Ekagra Library",
  marathiName: "एकाग्र अभ्यासिका",
  description:
    "Peaceful study library (abhyasika) in Lohegaon, Pune for UPSC, MPSC, NEET and JEE students. Open 7 days, 8 am to 9 pm. Wi-Fi, CCTV, parking, reserved desks.",
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
  days: "Open all 7 days. No holidays.",
  opens: "08:00",
  closes: "21:00",
  // Google Maps listing (place ID 0x3bc2c7b373b81c73:0x79b28d4e71ed84c5).
  mapsUrl: "https://maps.google.com/?cid=8769226792502133957",
  mapEmbedUrl: "https://maps.google.com/maps?q=18.6019402,73.9125204&z=16&hl=en&output=embed",
  geo: { latitude: 18.6019402, longitude: 73.9125204 },
  postalAddress: {
    streetAddress: "Royal Heights, Sr. No. 285, 3/4, Porwal Sathe Wasti Road, opposite Gini Bellina, Kutwal Colony",
    addressLocality: "Lohegaon, Pune",
    addressRegion: "Maharashtra",
    postalCode: "411047",
    addressCountry: "IN",
  },
};

// Search: what people type to find a study library around Lohegaon. Used in
// page titles, meta keywords and structured data; visible copy stays natural.
export const seo = {
  title: "Study Library in Lohegaon, Pune for UPSC & MPSC",
  updated: "2026-10-25",
  keywords: [
    "study library in Lohegaon",
    "library in Lohegaon",
    "abhyasika in Lohegaon",
    "अभ्यासिका लोहगाव",
    "study library in Pune",
    "self study library Pune",
    "reading room in Lohegaon",
    "UPSC study library Pune",
    "MPSC study library Pune",
    "MPSC abhyasika Pune",
    "NEET study library Pune",
    "JEE study library Pune",
    "competitive exam library Lohegaon",
    "study library near Porwal Road",
    "study library Kutwal Colony",
    "library open 7 days Pune",
    "Pune 411047",
  ],
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
  { title: "Open all 7 days", body: "No holidays. Every day from 8 am to 9 pm." },
  { title: "Wi-Fi", body: "For online lectures, mock tests and notes." },
  { title: "CCTV cameras", body: "The library is watched by CCTV cameras." },
  { title: "Separate washrooms", body: "Separate toilets and bathrooms for men and women." },
  { title: "Parking", body: "Parking is available at the library." },
  { title: "A big family", body: "Study together, take breaks together, and make friends who are on the same path." },
];

export type DayMoment = { time: string; period: "am" | "pm"; title: string; body: string; photo: Photo };

export const day: DayMoment[] = [
  { time: "8:00", period: "am", title: "Doors open", body: "The hall opens and the first desks fill up.", photo: photos.laptopLampWindow },
  { time: "10:00", period: "am", title: "The long stretch", body: "The quietest hours of the day. Heads down, pages turning.", photo: photos.aspirantsStudying },
  { time: "1:30", period: "pm", title: "A break together", body: "Step out, eat, talk through a tough topic with friends. Then back to the desk.", photo: photos.studentsTogether },
  { time: "5:00", period: "pm", title: "Revision light", body: "Late sun through the windows. Answer writing and revision.", photo: photos.sunlitStudyArea },
  { time: "7:00", period: "pm", title: "The evening push", body: "The last hours, when the day’s targets get finished.", photo: photos.vintageLampBooks },
  { time: "9:00", period: "pm", title: "Closing time", body: "The hall closes. Same desk, same time tomorrow.", photo: photos.domedRoom },
];

export const faqs: { q: string; a: string }[] = [
  {
    q: "Where is Ekagra Library?",
    a: `Ekagra Library is a study library in ${site.area}, ${site.city}: ${site.address.join(", ")}.`,
  },
  { q: "What are the timings?", a: `Every day, ${site.hours}.` },
  { q: "Are you open on Sundays and holidays?", a: "Yes. The library is open all 7 days of the week, with no holidays." },
  { q: "Can I reserve a desk?", a: "Yes. Reserve your own desk and keep it every day, or skip the reservation and sit at any free seat." },
  { q: "Which exams do students here prepare for?", a: "Students here prepare for UPSC, MPSC, NEET, JEE and every other competitive exam." },
  { q: "Is it safe?", a: "The library has CCTV cameras, and separate toilets and bathrooms for men and women." },
  { q: "Is there Wi-Fi and parking?", a: "Yes. The library has Wi-Fi for online lectures and mock tests, and parking is available." },
  { q: "How do I join?", a: `Visit us, call ${site.phone}, or send an enquiry using the form below and we’ll call you back.` },
];
