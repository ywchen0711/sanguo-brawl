// Heads drawn by hand, pixel by pixel, in the manner of HD-2D sprites: a big mass of hair, the face low and to
// the front, eyes as small dark marks, three tones to every colour. Every head faces right (three-quarters
// toward us); the chin and neck meet at ANCHOR. Hats and beards are laid over the head; the eyes, brows and
// mouth are put on last so they can change with the pose.
//
// letters: H hair, G hair light, h hair shade | S skin, L skin light, s skin shade, t skin deep
//          A hat, B hat light, a hat shade | R second colour, r its shade | Y gold, y gold shade
//          D beard, F beard light, d beard shade | z stubble | . nothing
export const ANCHOR = [9, 16.5];

const short = [
  '......hhhhh.....',
  '....hhHGGHHhh...',
  '...hHGGHHHHHHh..',
  '..hHGHHHHHHHHHh.',
  '..hHHHHHHHHHHHH.',
  '.hhHHHHHHHHHHHHh',
  '.hhHHHHHHHHSHHH.',
  '.hhhHHHHHSSSSHS.',
  '.hhhHHHHSSSSSSSS',
  '.hhhHHtsSSSSSSSS',
  '..hhHHtsSSSSSSSS',
  '..hhhHssSSSSSSS.',
  '...hhhssSSSSSSS.',
  '....hhhsSSSSSSS.',
  '.....hhssSSSSSS.',
  '.......ssSSSSs..',
  '.........ssss...',
];
const long = short.slice(0, 14).concat([
  '..hhhhhssSSSSSS.',
  '..hHhh.ssSSSSs..',
  '..hHhh...ssss...',
  '..hHhh..........',
  '..hHhh..........',
  '..hhHh..........',
  '...hhh..........',
  '...hh...........',
]);
const bald = [
  '......sssss.....',
  '....ssSLLSSss...',
  '...sSLLSSSSSSs..',
  '..sSLSSSSSSSSSs.',
  '..sSSSSSSSSSSSS.',
  '.ssSSSSSSSSSSSSs',
  '.ssSSSSSSSSSSSS.',
  '.sssSSSSSSSSSSS.',
  '.hhsSSSSSSSSSSSS',
  '.hhhsStsSSSSSSSS',
  '..hhsStsSSSSSSSS',
  '..hhhsssSSSSSSS.',
  '...hhhssSSSSSSS.',
  '....hhssSSSSSSS.',
  '.....hhssSSSSSS.',
  '.......ssSSSSs..',
  '.........ssss...',
];
export const HEADS = { short, long, bald };

// [first row, rows]
export const HATS = {
  bun: [-3, ['......hHh.......', '.....hHGHh......', '......hHh.......', '......aAa.......']],
  crown: [-4, ['...YYYYYYYYy....', '.....aABAA......', '.....aAAAA......', '.....aAAAA......', '.....aaaa.......']],
  band: [4, ['..aAAAAAAAAAAAA.', 'aaAAAAAAAAAAAAAa', 'aa..............', '.aa.............', '..a.............']],
  turban: [-1, ['.....aaAAAa.....', '...aAAABBAAAa...', '..aAABBAAAAAAa..', '.aAAAAAAAaAAAAa.', '.aAAAaAAAAAAaAA.', '.aAAAAAAAAAaAAAa', 'aaAaAAAAAAAAAAAA', 'aaaAAAaAAAAAAAa.', 'aa..............', '.aa.............', '..a.............']],
  helm: [-2, ['.......Yy.......', '......aAAa......', '....aABBAAAa....', '...aBBAAAAAAa...', '..aBAAAAAAAAAa..', '.aAAAAAAAAYAAAa.', '.aAAAAAAAYYYAAAa', '.aAAAAAAAAAAAAAa', 'aaaaaaaaaaaaaaaa', 'aAAa............', 'aAAa............', 'aAAa............', 'aaAa............', '.aa.............']],
  scholar: [-5, ['....aAAAAa......', '....aABAAa......', '....aAAAAa......', '...aAAAAAAa.....', '...aAAAAAAa.....', '..aaaaaaaaaa....', '.aa.............', 'aa..............']],
  hood: [-1, ['....aAAAAAa.....', '..aAAABBAAAAa...', '.aAABBAAAAAAAa..', '.aAAAAAAAAAAAAa.', 'aAAAAAAAAAAAAAa.', 'aAAAAAAAAAAAAAA.', 'aAAAAAAAAAAAAaa.', 'aAAAAAAAaa......', 'aAAAAAAa........', 'aAAAAAa.........', 'aAAAAAa.........', 'aAAAAAa.........', 'aAAAAAAa........', '.aAAAAAAa.......', '..aAAAAa........', '...aaaa.........']],
};
HATS.plume = [-7, ['......RRr.......', '....RRRRr.......', '..RRRRr.........', '.RRRr...........', 'RRr.............', 'Rr.....Yy.......'].concat(HATS.helm[1].slice(1).map((r, i) => (i < 6 ? 'R' + r.slice(1) : r)))];
HATS.feathers = HATS.helm;    // the pheasant feathers are drawn as curves on top of the helm

export const BEARDS = {
  long: [12, ['..........DDDDD.', '.........dDDDDD.', '........dDDDDDD.', '........dDDDDD..', '........dDDFDD..', '.........dDFD...', '.........dDDD...', '.........dDFD...', '..........dDD...', '..........dD....', '..........dD....', '...........d....']],
  bushy: [12, ['....d.....DDDDDD', '...dDd...dDDDDDd', '....dDDDDFDDDDD.', '...dDDDDDDDFDd..', '....dDDDDDDDd...', '.....dD.dDD.d...', '......d...d.....']],
  goatee: [12, ['..........DDDDD.', '...........d..d.', '..........dD....', '..........dD....', '...........d....']],
  mustache: [12, ['..........DDDDD.', '..........d...d.']],
  stubble: [13, ['........z.z.z...', '.........z.z....']],
};
