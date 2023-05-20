enum Rating {
  U = 'U',
  PG = 'PG',
  TWELVE = '12',
  FIFTEEN = '15',
  EIGHTEEN = '18',
}

export type Movie = {
  id?: string;
  title: string;
  year: string;
  rating: Rating;
};

export type Movies = Movie[];

// note: these are hard coded movies for now
// for our basic example i.e. no datastores
export const movies: Movies = [
  {
    id: '180aba94-88e8-4f83-9dcb-0dd437d93ff8',
    title: 'movie one',
    year: '2019',
    rating: Rating.EIGHTEEN,
  },
  {
    id: 'cbbccaba-3ab9-4af0-a157-0e5cfd654e20',
    title: 'movie two',
    year: '2020',
    rating: Rating.PG,
  },
  {
    id: '31adad13-c876-4231-b8b1-cb45926ba1c8',
    title: 'movie three',
    year: '2007',
    rating: Rating.U,
  },
];
