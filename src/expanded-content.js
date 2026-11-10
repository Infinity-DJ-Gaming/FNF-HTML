export const EXPANDED_BASE = 'assets/expanded/';
export const EXPANDED_WEEKS = [
  {id:7, name:'TANKMAN FT. JOHNNYUTAH', songs:['ugh','guns','stress'], color:'#f9cf51', character:'bf'},
  {id:'weekend1', name:'DUE DEBTS', songs:['darnell','lit-up','2hot','blazin'], color:'#413cae', character:'pico'},
  {id:'sky', name:'BFSWIFEFOREVER', songs:['wife-forever','sky','manifest'], color:'#52bfff', character:'bf'}
];

export function playerIdentity(id='') {
  return id.startsWith('sky')?'sky':id.startsWith('pico')?'pico':'bf';
}

export class ExpandedContent {
  constructor() {
    this.songs = new Map();
    this.media = {};
  }

  async load() {
    const response = await fetch(EXPANDED_BASE+'songs.json');
    if (!response.ok) throw new Error('The expanded song catalogue could not be loaded.');
    for (const record of await response.json()) {
      if (!this.songs.has(record.baseSong)) this.songs.set(record.baseSong, []);
      this.songs.get(record.baseSong).push(record);
    }
  }

  entries(existing) {
    const seen = new Set(existing.map(song=>song.id));
    const result = [];
    for (const id of [...EXPANDED_WEEKS.flatMap(week=>week.songs), ...this.songs.keys()]) {
      if (seen.has(id)) continue;
      seen.add(id);
      const records=this.songs.get(id)||[];
      const entry = records.find(record=>record.variant==='classic')||records[0];
      if (entry) result.push({...entry,id,opponent:entry.characters.opponent});
    }
    return result;
  }

  levels(id, character) {
    return [...new Set((this.songs.get(id)||[])
      .filter(record=>record.character===character)
      .flatMap(record=>record.difficulties))];
  }

  instrumentals(id,character,level){
    const record=this.choice(id,character,level,'default');
    return ['default',...(record?.characters.altInstrumentals||[]).filter(id=>this.songs.get(record.baseSong)?.some(variant=>variant.variant===id))];
  }

  choice(id, character, level, instrumental) {
    const records = this.songs.get(id);
    if (!records) return null;
    const matches = records.filter(record=>record.character===character);
    const preferred = matches.find(record=>record.variant==='classic'&&record.difficulties.includes(level)) ||
      matches.find(record=>record.difficulties.includes(level));
    // When browsing an unavailable entry, provide its default metadata for the UI.
    const record = preferred || matches[0] || records[0];
    if (!record) return null;
    const actual = record.charts[level]?level:record.charts.normal?'normal':record.difficulties[0];
    const alternative = record.characters.altInstrumentals?.includes(instrumental)&&records.find(item=>item.variant===instrumental);
    const tracks = record.tracks.map((track,index)=>index===0&&alternative?alternative.tracks[0]:track);
    return {...record,level:actual,opponent:record.characters.opponent,noteStyle:record.playData.noteStyle,
      chartUrl:EXPANDED_BASE+record.charts[actual], audioUrls:tracks.map(track=>EXPANDED_BASE+track.file),
      audioRoles:tracks.map(track=>track.role), audioOffsets:tracks.map(track=>track.offset)};
  }
}
