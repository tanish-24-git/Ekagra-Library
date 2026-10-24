// Stock photographs used on the homepage while the library's own photos are
// being taken. All are CC0 (public domain) from Wikimedia Commons, so no
// credit has to be shown; the source is kept for reference.

export type Photo = {
  src: string;
  width: number;
  height: number;
  alt: string;
  credit: { author: string; license: string; source: string };
};

const photo = (slug: string, width: number, height: number, alt: string, author: string, license: string, file: string): Photo => ({
  src: `/images/library/${slug}.jpg`,
  width,
  height,
  alt,
  credit: { author, license, source: `https://commons.wikimedia.org/wiki/File:${file}` },
});

export const photos = {
  readingHall: photo("reading-hall", 2400, 3199, "A long reading hall with wooden tables, brass chandeliers and tall windows, students working quietly", "Chevsapher", "CC0", "UT_Austin_Main_Building,_Library_Reading_Room,_2025.jpg"),
  domedRoom: photo("domed-reading-room", 2400, 1600, "A circular reading room under a glass dome, lined with wooden bookshelves", "Michael D Beckwith", "CC0", "Liverpool_Central_Library_Picton_Reading_Room_(49004383957).jpg"),
  aspirantsStudying: photo("aspirants-studying", 2400, 1600, "A full study hall of students bent over their books", "Gary Todd", "CC0", "Sias_Library_-_Students_Studying_2017.jpg"),
  booksByWindow: photo("books-by-window", 2400, 1602, "A stack of books and a lamp on a desk beside a window", "chuttersnap", "CC0", "Books_in_stack_with_lamps_(Unsplash).jpg"),
  fountainPen: photo("fountain-pen", 2400, 1802, "A fountain pen writing notes on lined paper", "Aaron Burden", "CC0", "Writing_with_a_fountain_pen_(Unsplash).jpg"),
  laptopLampWindow: photo("laptop-lamp-window", 2400, 1594, "Morning light from a window over a desk with a lamp and a laptop", "Tatiana Lapina", "CC0", "Laptop_and_lamp_on_table_(Unsplash).jpg"),
  studentsTogether: photo("students-together", 2400, 1600, "A group of smiling students sharing a table in a library", "Bjeweld", "CC0", "Smiling_Students_at_Cebu_City_Public_Library.jpg"),
  sunlitStudyArea: photo("sunlit-study-area", 2400, 1800, "Sunlight pouring through tall windows onto a study area where people sit and read", "Andy Li", "CC0", "Study_area_with_a_nice_view_on_the_upper_floor_of_Jubilee_Library.jpg"),
  vintageLampBooks: photo("vintage-lamp-books", 2400, 1776, "A warm lamp glowing beside a stack of old books in the dark", "Jez Timms", "CC0", "Vintage_lamp_and_books_(Unsplash).jpg"),
} satisfies Record<string, Photo>;

export const allPhotos = Object.values(photos);
