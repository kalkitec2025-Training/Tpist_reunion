// Real photographs, used under the Unsplash License (free, credit appreciated)
// and the Pexels License (free, no credit required). They are loaded from the
// providers' image CDNs ("hotlinking"), which Unsplash requires.
//
// None of these photos show a real BACK2CAMPUS venue or vendor. Venue cards use
// them only as illustrations and are labelled DEMO until real listings exist.

export type Photo = {
  id: string;
  src: string;
  alt: string;
  credit: string;
  creditUrl: string;
  source: 'Unsplash' | 'Pexels';
};

const u = (id: string) => `https://images.unsplash.com/photo-${id}`;

const list: Photo[] = [
  { id: 'kidsHug', src: u('1489942986787-cded4ecf962e'), alt: 'Two schoolboys hugging and laughing outside a small school', credit: 'Aman Shrivastava', creditUrl: 'https://unsplash.com/@amansks91', source: 'Unsplash' },
  { id: 'graduates', src: u('1761781342506-821be95168c5'), alt: 'Graduates in blue caps and gowns sitting together', credit: 'Ethan Gowans', creditUrl: 'https://unsplash.com/@ethan_gowans', source: 'Unsplash' },
  { id: 'rkStatue', src: u('1638705350009-e8c85668d2ef'), alt: 'Statue of a woman on a dolphin at RK Beach, Visakhapatnam', credit: 'Vizag Explore', creditUrl: 'https://unsplash.com/@vizagexplore', source: 'Unsplash' },
  { id: 'beachGroup', src: u('1659894142966-cf93aa35119b'), alt: 'A group of people standing on RK Beach, Visakhapatnam', credit: 'Uday Agastya', creditUrl: 'https://unsplash.com/@udayagastya77', source: 'Unsplash' },
  { id: 'vizagWaves', src: u('1755450060635-3a6204bc0e8c'), alt: 'Waves breaking on the sand under a clear sky in Visakhapatnam', credit: 'Satish Dharmavarapu', creditUrl: 'https://unsplash.com/@satishdharmavarapu', source: 'Unsplash' },
  { id: 'vizagBeachDay', src: u('1755450059876-3d35a08d4400'), alt: 'People enjoying a hazy day at the beach in Visakhapatnam', credit: 'Satish Dharmavarapu', creditUrl: 'https://unsplash.com/@satishdharmavarapu', source: 'Unsplash' },
  { id: 'beachRoad', src: u('1594313059730-8d0a02f44847'), alt: 'Palm trees along Beach Road, Visakhapatnam', credit: 'Aditya Krishnapavan', creditUrl: 'https://unsplash.com/@adityakpt', source: 'Unsplash' },
  { id: 'familySelfie', src: u('1538397168321-d8614bad84bf'), alt: 'A family taking a selfie on an evening out in New Delhi', credit: 'Parij Borgohain', creditUrl: 'https://unsplash.com/@35mmlife', source: 'Unsplash' },
  { id: 'friendsSelfie', src: u('1758275557275-eeec6a1e654e'), alt: 'A group of friends taking a selfie outdoors in a park', credit: 'Vitaly Gariev', creditUrl: 'https://unsplash.com/@silverkblack', source: 'Unsplash' },
  { id: 'villageKids', src: u('1495983239379-7f250e210f10'), alt: 'A group of children together near a house', credit: 'Nischal Masand', creditUrl: 'https://unsplash.com/@nischalmasand', source: 'Unsplash' },
  { id: 'classroom', src: u('1763098844157-d0fffcc966a1'), alt: 'Sunlight streaming into an empty classroom with desks', credit: 'Jun Ren', creditUrl: 'https://unsplash.com/@renjunn', source: 'Unsplash' },
  { id: 'hotelPool', src: u('1732192208240-e73d980ef25d'), alt: 'A hotel swimming pool with a bridge in the background', credit: 'kai muro', creditUrl: 'https://unsplash.com/@turuturu', source: 'Unsplash' },
  { id: 'dinnerTable', src: u('1596754860837-506f408b0a8e'), alt: 'People sitting together at a long dinner table', credit: 'Kvnga', creditUrl: 'https://unsplash.com/@kvnga', source: 'Unsplash' },
  { id: 'lunch', src: u('1710438595788-830de4226891'), alt: 'A man enjoying a meal served on a blue plate', credit: 'Kuntal Maity', creditUrl: 'https://unsplash.com/@kuntal1461', source: 'Unsplash' },
  { id: 'resortPool', src: 'https://images.pexels.com/photos/1134175/pexels-photo-1134175.jpeg', alt: 'A resort pool with modern architecture and palm trees', credit: 'Pexels', creditUrl: 'https://www.pexels.com/photo/1134175/', source: 'Pexels' },
  { id: 'lectureHall', src: 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg', alt: 'An empty lecture hall with wooden chairs and a blackboard', credit: 'Pexels', creditUrl: 'https://www.pexels.com/photo/207691/', source: 'Pexels' }
];

export const photos = Object.fromEntries(list.map((p) => [p.id, p])) as Record<string, Photo>;
export const allPhotos = list;

/** Sized URL for a photo, using each CDN's resize parameters. */
export function photoUrl(p: Photo, width: number, height?: number): string {
  if (p.source === 'Unsplash') {
    const h = height ? `&h=${height}` : '';
    return `${p.src}?auto=format&fit=crop&w=${width}${h}&q=70`;
  }
  const h = height ? `&h=${height}&fit=crop` : '';
  return `${p.src}?auto=compress&cs=tinysrgb&w=${width}${h}`;
}
