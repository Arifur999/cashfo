// One quote a day on the Book page banner. Both fields go through t() (see
// dictionary/books.ts), so each has a Bangla line.
export interface ReadingQuote {
  text: string;
  by: string;
}

export const READING_QUOTES: ReadingQuote[] = [
  { text: "A reader lives a thousand lives before he dies.", by: "George R.R. Martin" },
  { text: "Reading is to the mind what exercise is to the body.", by: "Joseph Addison" },
  { text: "Read in the name of your Lord who created.", by: "Quran 96:1" },
  { text: "Books are a uniquely portable magic.", by: "Stephen King" },
  { text: "Today a reader, tomorrow a leader.", by: "Margaret Fuller" },
  { text: "The more that you read, the more things you will know.", by: "Dr. Seuss" },
  { text: "I have always imagined that Paradise will be a kind of library.", by: "Jorge Luis Borges" },
];
