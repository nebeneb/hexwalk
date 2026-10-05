export type Video = {
  id: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
};

const artwork = {
  ocean: '/thumbnails/f8eafc4becb93a346fe397f82a1aa806.jpg',
  wave: '/thumbnails/9da94be05b316f8169272e33abdc63ff.jpg',
  fish: '/thumbnails/b9960878030e6ba247d01e20f8e8f2e7.jpg',
  signal: '/thumbnails/8f6d5dd7750fdfc3e5189af97f0d881c.jpg',
  vinyl: '/thumbnails/899d86c318725a912451be4c0ea51aa1.jpg',
  speaker: '/thumbnails/2103164393a248bcb4aec12d5b7bf571.jpg',
  ripple: '/thumbnails/077e56aedd5855f42709581ab2cbb017.jpg',
  coast: '/thumbnails/72a7da4fba525e02e746da6c442c938d.jpg',
  current: '/thumbnails/13ee3698d9212ae45da37a7c71d1497d.jpg',
  tank: '/thumbnails/14d18f11acbbc4570349b1bb8e2d199f.jpg',
};

// Local mock videos deliberately follow the ocean and science artwork supplied
// with the design. No search, recommendation, or thumbnail needs a live API.
export const videos: Video[] = [
  { id: 'ocean-motion', title: 'Why ocean swells travel thousands of miles', channel: 'Littoral', duration: '18:42', thumbnail: artwork.ocean },
  { id: 'waves-begin', title: 'How do ocean waves actually work?', channel: 'Practical Engineering', duration: '11:08', thumbnail: artwork.wave },
  { id: 'deep-sea', title: 'How whales sing across entire oceans', channel: 'Deep Field', duration: '14:08', thumbnail: artwork.fish },
  { id: 'sound-waves', title: 'The invisible shape of sound', channel: 'Steve Mould', duration: '12:17', thumbnail: artwork.signal },
  { id: 'currents', title: 'The ocean currents that shape our world', channel: 'PBS Terra', duration: '16:04', thumbnail: artwork.current },
  { id: 'coastal-erosion', title: 'Why coastlines never stand still', channel: 'MinuteEarth', duration: '6:28', thumbnail: artwork.coast },
  { id: 'wave-tank', title: 'Making a perfect wave in a tiny tank', channel: 'The Slow Mo Guys', duration: '9:51', thumbnail: artwork.tank },
  { id: 'ripples', title: 'What a drop of water can teach us', channel: 'SmarterEveryDay', duration: '13:42', thumbnail: artwork.ripple },
  { id: 'vinyl', title: 'How a record stores an entire song', channel: 'Technology Connections', duration: '18:26', thumbnail: artwork.vinyl },
  { id: 'speaker', title: 'How speakers turn electricity into sound', channel: 'Branch Education', duration: '10:14', thumbnail: artwork.speaker },
  { id: 'tidal-force', title: 'The surprisingly complicated science of tides', channel: 'PBS Space Time', duration: '15:09', thumbnail: artwork.ocean },
  { id: 'breaking-waves', title: 'Why some waves break and others do not', channel: 'Physics Girl', duration: '7:35', thumbnail: artwork.wave },
  { id: 'fish-sense', title: 'How fish feel the water around them', channel: 'Deep Look', duration: '5:48', thumbnail: artwork.fish },
  { id: 'resonance', title: 'Resonance: when a small push changes everything', channel: 'Steve Mould', duration: '13:26', thumbnail: artwork.signal },
  { id: 'whirlpools', title: 'The strange physics of ocean whirlpools', channel: 'Veritasium', duration: '17:12', thumbnail: artwork.current },
  { id: 'sand', title: 'Where does all the sand on a beach come from?', channel: 'MinuteEarth', duration: '4:57', thumbnail: artwork.coast },
  { id: 'tsunami', title: 'What makes a tsunami different from a wave?', channel: 'Practical Engineering', duration: '12:39', thumbnail: artwork.tank },
  { id: 'interference', title: 'Two waves, one beautiful interference pattern', channel: '3Blue1Brown', duration: '19:06', thumbnail: artwork.ripple },
  { id: 'record-grooves', title: 'Inside the microscopic grooves of a record', channel: 'Applied Science', duration: '11:54', thumbnail: artwork.vinyl },
  { id: 'hearing', title: 'What happens when we hear a sound?', channel: 'TED-Ed', duration: '5:23', thumbnail: artwork.speaker },
  { id: 'blue-ocean', title: 'Why is the ocean blue?', channel: 'SciShow', duration: '8:19', thumbnail: artwork.ocean },
  { id: 'rogue-wave', title: 'The mystery of rogue waves', channel: 'PBS Terra', duration: '14:08', thumbnail: artwork.wave },
  { id: 'bioluminescence', title: 'The animals that make their own light', channel: 'BBC Earth', duration: '9:37', thumbnail: artwork.fish },
  { id: 'fourier', title: 'A simple introduction to Fourier transforms', channel: '3Blue1Brown', duration: '20:41', thumbnail: artwork.signal },
  { id: 'gulf-stream', title: 'A journey along the Gulf Stream', channel: 'Real Science', duration: '16:52', thumbnail: artwork.current },
  { id: 'sea-arches', title: 'How the sea carves arches from solid rock', channel: 'National Geographic', duration: '7:16', thumbnail: artwork.coast },
  { id: 'water-experiments', title: 'Five water experiments worth watching slowly', channel: 'The Slow Mo Guys', duration: '10:43', thumbnail: artwork.tank },
  { id: 'surface-tension', title: 'The hidden world of surface tension', channel: 'SmarterEveryDay', duration: '15:31', thumbnail: artwork.ripple },
  { id: 'analog-digital', title: 'The curious difference between analog and digital sound', channel: 'Technology Connections', duration: '22:07', thumbnail: artwork.vinyl },
  { id: 'acoustics', title: 'Why every room has its own sound', channel: 'Branch Education', duration: '12:48', thumbnail: artwork.speaker },
  { id: 'moon-ocean', title: 'The quiet connection between the Moon and the ocean', channel: 'Astrum', duration: '13:54', thumbnail: artwork.ocean },
  { id: 'surf-science', title: 'The science of finding the perfect surf break', channel: 'PBS Terra', duration: '11:27', thumbnail: artwork.wave },
  { id: 'ocean-dark', title: 'What lives where sunlight never reaches?', channel: 'Real Science', duration: '18:05', thumbnail: artwork.fish },
  { id: 'standing-waves', title: 'Standing waves you can see with your own eyes', channel: 'Steve Mould', duration: '9:44', thumbnail: artwork.signal },
  { id: 'ocean-heat', title: 'How the ocean carries heat around the planet', channel: 'MinuteEarth', duration: '6:03', thumbnail: artwork.current },
  { id: 'coast-math', title: 'Why measuring a coastline is almost impossible', channel: 'Veritasium', duration: '16:18', thumbnail: artwork.coast },
];

const words = (text: string) => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
const stopWords = new Set(['a', 'an', 'and', 'the', 'of', 'in', 'to', 'is', 'how', 'why', 'with', 'its', 'do', 'your', 'can', 'from', 'what']);
const subjectWords = (text: string) => words(text).filter((word) => !stopWords.has(word));

/** A forgiving local search that still offers an entry point for any query. */
export function searchVideos(query: string): Video[] {
  const terms = subjectWords(query.trim());
  if (!terms.length) return videos.slice(0, 5);

  const ranked = videos.map((video, index) => {
    const title = video.title.toLowerCase();
    const channel = video.channel.toLowerCase();
    const score = terms.reduce((total, term) => total + (title.includes(term) ? 3 : 0) + (channel.includes(term) ? 1 : 0), 0);
    return { video, score, index };
  }).sort((a, b) => b.score - a.score || a.index - b.index);

  const matches = ranked.filter(({ score }) => score > 0);
  return (matches.length ? matches : ranked).slice(0, 5).map(({ video }) => video);
}

const hash = (value: string) => {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
};

/** Stable mock neighbors; use every unseen video before recycling the catalog. */
export function recommendVideos(video: Video, excluded: string[], count: number): Video[] {
  if (count <= 0) return [];
  const excludedIds = new Set([...excluded, video.id]);
  const subject = new Set(subjectWords(video.title));
  const ranked = videos.filter((candidate) => candidate.id !== video.id).map((candidate) => ({
    video: candidate,
    score: subjectWords(candidate.title).reduce((total, word) => total + (subject.has(word) ? 1 : 0), 0)
      + (candidate.channel === video.channel ? 1 : 0),
    order: hash(`${video.id}:${candidate.id}`),
  })).sort((a, b) => b.score - a.score || a.order - b.order);

  const unseen = ranked.filter(({ video: candidate }) => !excludedIds.has(candidate.id));
  const seen = ranked.filter(({ video: candidate }) => excludedIds.has(candidate.id));
  const result: Video[] = [];
  const artworkCounts = new Map<string, number>([[video.thumbnail, 1]]);
  // Favor a varied set of supplied illustrations while keeping related topics
  // near the top. Exhaust the unseen group before considering existing videos.
  for (const group of [unseen, seen]) {
    const pool = [...group];
    while (pool.length && result.length < count) {
      pool.sort((a, b) => {
        const scoreA = a.score - (artworkCounts.get(a.video.thumbnail) ?? 0) * 4;
        const scoreB = b.score - (artworkCounts.get(b.video.thumbnail) ?? 0) * 4;
        return scoreB - scoreA || a.order - b.order;
      });
      const candidate = pool.shift()!.video;
      result.push(candidate);
      artworkCounts.set(candidate.thumbnail, (artworkCounts.get(candidate.thumbnail) ?? 0) + 1);
    }
  }
  while (result.length < count) result.push(ranked[result.length % ranked.length].video);
  return result;
}
