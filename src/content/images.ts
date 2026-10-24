// Stock photographs used on the homepage while the library's own photos are
// being taken. All are from Wikimedia Commons under the licences listed; the
// CC BY / BY-SA ones require the credit shown on /credits.

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
  archedWindows: photo("arched-windows", 2400, 1800, "Sunlight through arched windows falling across rows of wooden study tables", "Generalissima", "CC BY-SA 4.0", "Western_Washington_University_Wilson_library_reading_room.jpg"),
  newspaperCorner: photo("newspaper-corner", 2400, 1600, "Readers at a long table with newspapers and magazines in an old Indian reading room", "Sumitsurai", "CC BY-SA 4.0", "Rammohun_Library_and_Free_Reading_Room_-_Main_Reading_Room_(2).jpg"),
  readingRoomDesks: photo("reading-room-desks", 2400, 1553, "Students studying at desks between tall wooden almirahs of books", "Sumitsurai", "CC BY-SA 4.0", "Rammohun_Library_and_Free_Reading_Room_-_Main_Reading_Room_(1).jpg"),
  aspirantsStudying: photo("aspirants-studying", 2400, 1600, "A full study hall of students bent over their books", "Gary Todd", "CC0", "Sias_Library_-_Students_Studying_2017.jpg"),
  bankersLamp: photo("bankers-lamp", 2400, 1600, "A green banker's lamp glowing over a desk at night", "VSchagow", "CC BY-SA 4.0", "Schreibtisch_mit_Bankers_Lamp_2015.jpg"),
  lampPullChain: photo("lamp-pull-chain", 2400, 3200, "A hand pulling the chain of a green desk lamp", "frankieleon", "CC BY 2.0", "Bring_The_Light_(3460404871).jpg"),
  booksByWindow: photo("books-by-window", 2400, 1602, "A stack of books and a lamp on a desk beside a window", "chuttersnap", "CC0", "Books_in_stack_with_lamps_(Unsplash).jpg"),
  fountainPen: photo("fountain-pen", 2400, 1802, "A fountain pen writing notes on lined paper", "Aaron Burden", "CC0", "Writing_with_a_fountain_pen_(Unsplash).jpg"),
} satisfies Record<string, Photo>;

export const allPhotos = Object.values(photos);
