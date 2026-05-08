export interface Kanji {
  k: string;
  m: string;        // meaning(s) separated by /
  on: string;       // on'yomi readings separated by / (hiragana), or "-"
  kun: string;      // kun'yomi readings separated by / (hiragana), or "-"
  level: number;    // 1=N5 ... 5=N1
  jlpt: "N5" | "N4" | "N3" | "N2" | "N1";
}

export type QuestionType = "meaning" | "onyomi" | "kunyomi";

export const KANJI_LIST: Kanji[] = [
  // ══════════════════════════════════════
  // JLPT N5 — Level 1
  // ══════════════════════════════════════
  { k:"一", m:"one / first",              on:"いち/いつ",          kun:"ひと/ひとつ",          level:1, jlpt:"N5" },
  { k:"二", m:"two / second",             on:"に",                 kun:"ふた/ふたつ",          level:1, jlpt:"N5" },
  { k:"三", m:"three",                    on:"さん",               kun:"み/みつ/みっつ",        level:1, jlpt:"N5" },
  { k:"四", m:"four",                     on:"し",                 kun:"よ/よつ/よっつ/よん",   level:1, jlpt:"N5" },
  { k:"五", m:"five",                     on:"ご",                 kun:"いつ/いつつ",           level:1, jlpt:"N5" },
  { k:"六", m:"six",                      on:"ろく",               kun:"む/むつ/むっつ",        level:1, jlpt:"N5" },
  { k:"七", m:"seven",                    on:"しち",               kun:"なな/ななつ",           level:1, jlpt:"N5" },
  { k:"八", m:"eight",                    on:"はち",               kun:"や/やつ/やっつ",        level:1, jlpt:"N5" },
  { k:"九", m:"nine",                     on:"く/きゅう",           kun:"ここの/ここのつ",       level:1, jlpt:"N5" },
  { k:"十", m:"ten",                      on:"じゅう/じっ",         kun:"とお/と",              level:1, jlpt:"N5" },
  { k:"百", m:"hundred",                  on:"ひゃく",             kun:"-",                    level:1, jlpt:"N5" },
  { k:"千", m:"thousand",                 on:"せん",               kun:"-",                    level:1, jlpt:"N5" },
  { k:"万", m:"ten thousand",             on:"まん/ばん",           kun:"-",                    level:1, jlpt:"N5" },
  { k:"円", m:"yen / circle / round",     on:"えん",               kun:"まる",                 level:1, jlpt:"N5" },
  { k:"日", m:"sun / day / Japan",        on:"にち/じつ",           kun:"ひ/か",                level:1, jlpt:"N5" },
  { k:"月", m:"moon / month",             on:"げつ/がつ",           kun:"つき",                 level:1, jlpt:"N5" },
  { k:"年", m:"year",                     on:"ねん",               kun:"とし",                 level:1, jlpt:"N5" },
  { k:"時", m:"time / hour / o'clock",    on:"じ",                 kun:"とき",                 level:1, jlpt:"N5" },
  { k:"分", m:"minute / part / understand",on:"ふん/ぶん/ぶ",       kun:"わ/わかる",            level:1, jlpt:"N5" },
  { k:"半", m:"half",                     on:"はん",               kun:"-",                    level:1, jlpt:"N5" },
  { k:"今", m:"now / present",            on:"こん/きん",           kun:"いま",                 level:1, jlpt:"N5" },
  { k:"前", m:"before / front / previous",on:"ぜん",               kun:"まえ",                 level:1, jlpt:"N5" },
  { k:"後", m:"after / behind / later",   on:"ご/こう",            kun:"あと/うしろ/のち",      level:1, jlpt:"N5" },
  { k:"午", m:"noon / 7th zodiac sign",   on:"ご",                 kun:"-",                    level:1, jlpt:"N5" },
  { k:"毎", m:"every / each",             on:"まい",               kun:"-",                    level:1, jlpt:"N5" },
  { k:"山", m:"mountain",                 on:"さん/せん",           kun:"やま",                 level:1, jlpt:"N5" },
  { k:"川", m:"river / stream",           on:"せん",               kun:"かわ",                 level:1, jlpt:"N5" },
  { k:"木", m:"tree / wood",              on:"もく/ぼく",           kun:"き/こ",                level:1, jlpt:"N5" },
  { k:"火", m:"fire",                     on:"か",                 kun:"ひ/ほ",                level:1, jlpt:"N5" },
  { k:"水", m:"water",                    on:"すい",               kun:"みず",                 level:1, jlpt:"N5" },
  { k:"土", m:"earth / soil / ground",    on:"ど/と",              kun:"つち",                 level:1, jlpt:"N5" },
  { k:"金", m:"gold / money / metal",     on:"きん/こん",           kun:"かね/かな",             level:1, jlpt:"N5" },
  { k:"空", m:"sky / empty / vacant",     on:"くう",               kun:"そら/あく/から",        level:1, jlpt:"N5" },
  { k:"花", m:"flower / blossom",         on:"か",                 kun:"はな",                 level:1, jlpt:"N5" },
  { k:"海", m:"sea / ocean",              on:"かい",               kun:"うみ",                 level:1, jlpt:"N5" },
  { k:"石", m:"stone / rock",             on:"せき/しゃく/こく",    kun:"いし",                 level:1, jlpt:"N5" },
  { k:"田", m:"rice field / rice paddy",  on:"でん",               kun:"た",                   level:1, jlpt:"N5" },
  { k:"林", m:"forest / grove",           on:"りん",               kun:"はやし",               level:1, jlpt:"N5" },
  { k:"森", m:"woods / forest",           on:"しん",               kun:"もり",                 level:1, jlpt:"N5" },
  { k:"雨", m:"rain",                     on:"う",                 kun:"あめ/あま",             level:1, jlpt:"N5" },
  { k:"風", m:"wind / style",             on:"ふう/ふ",            kun:"かぜ/かざ",             level:1, jlpt:"N5" },
  { k:"雪", m:"snow",                     on:"せつ",               kun:"ゆき",                 level:1, jlpt:"N5" },
  { k:"草", m:"grass / plants",           on:"そう",               kun:"くさ",                 level:1, jlpt:"N5" },
  { k:"竹", m:"bamboo",                   on:"ちく",               kun:"たけ",                 level:1, jlpt:"N5" },
  { k:"虫", m:"insect / bug / worm",      on:"ちゅう",             kun:"むし",                 level:1, jlpt:"N5" },
  { k:"魚", m:"fish",                     on:"ぎょ",               kun:"さかな/うお",           level:1, jlpt:"N5" },
  { k:"鳥", m:"bird",                     on:"ちょう",             kun:"とり",                 level:1, jlpt:"N5" },
  { k:"犬", m:"dog",                      on:"けん",               kun:"いぬ",                 level:1, jlpt:"N5" },
  { k:"猫", m:"cat",                      on:"びょう",             kun:"ねこ",                 level:1, jlpt:"N5" },
  { k:"馬", m:"horse",                    on:"ば/ま",              kun:"うま/め",              level:1, jlpt:"N5" },
  { k:"目", m:"eye",                      on:"もく/ぼく",           kun:"め/ま",                level:1, jlpt:"N5" },
  { k:"口", m:"mouth / opening",          on:"こう/く",            kun:"くち",                 level:1, jlpt:"N5" },
  { k:"耳", m:"ear",                      on:"じ",                 kun:"みみ",                 level:1, jlpt:"N5" },
  { k:"手", m:"hand",                     on:"しゅ",               kun:"て/た",                level:1, jlpt:"N5" },
  { k:"足", m:"foot / leg / enough",      on:"そく",               kun:"あし/た",              level:1, jlpt:"N5" },
  { k:"頭", m:"head / top",               on:"とう/ず/と",          kun:"あたま/かしら",         level:1, jlpt:"N5" },
  { k:"心", m:"heart / mind / spirit",    on:"しん",               kun:"こころ",               level:1, jlpt:"N5" },
  { k:"体", m:"body",                     on:"たい/てい",           kun:"からだ",               level:1, jlpt:"N5" },
  { k:"顔", m:"face / expression",        on:"がん",               kun:"かお",                 level:1, jlpt:"N5" },
  { k:"毛", m:"hair / fur / feather",     on:"もう",               kun:"け",                   level:1, jlpt:"N5" },
  { k:"人", m:"person / people",          on:"じん/にん",           kun:"ひと",                 level:1, jlpt:"N5" },
  { k:"子", m:"child / offspring",        on:"し/す",              kun:"こ/ね",                level:1, jlpt:"N5" },
  { k:"男", m:"man / male",               on:"だん/なん",           kun:"おとこ",               level:1, jlpt:"N5" },
  { k:"女", m:"woman / female",           on:"じょ/にょ/にょう",    kun:"おんな/め",            level:1, jlpt:"N5" },
  { k:"父", m:"father",                   on:"ふ",                 kun:"ちち",                 level:1, jlpt:"N5" },
  { k:"母", m:"mother",                   on:"ぼ",                 kun:"はは",                 level:1, jlpt:"N5" },
  { k:"兄", m:"older brother",            on:"けい/きょう",         kun:"あに",                 level:1, jlpt:"N5" },
  { k:"姉", m:"older sister",             on:"し",                 kun:"あね",                 level:1, jlpt:"N5" },
  { k:"弟", m:"younger brother",          on:"てい/だい/で",        kun:"おとうと",             level:1, jlpt:"N5" },
  { k:"妹", m:"younger sister",           on:"まい",               kun:"いもうと",             level:1, jlpt:"N5" },
  { k:"友", m:"friend",                   on:"ゆう",               kun:"とも",                 level:1, jlpt:"N5" },
  { k:"王", m:"king / ruler",             on:"おう",               kun:"-",                    level:1, jlpt:"N5" },
  { k:"先", m:"previous / ahead / tip",   on:"せん",               kun:"さき",                 level:1, jlpt:"N5" },
  { k:"生", m:"life / birth / raw",       on:"せい/しょう",         kun:"いきる/うまれる/なま/おう", level:1, jlpt:"N5" },
  { k:"学", m:"study / learn / school",   on:"がく",               kun:"まなぶ",               level:1, jlpt:"N5" },
  { k:"校", m:"school / printing",        on:"こう",               kun:"-",                    level:1, jlpt:"N5" },
  { k:"語", m:"language / word / speak",  on:"ご",                 kun:"かたる/かたらう",       level:1, jlpt:"N5" },
  { k:"文", m:"sentence / writing / culture",on:"ぶん/もん",       kun:"ふみ",                 level:1, jlpt:"N5" },
  { k:"字", m:"character / letter",       on:"じ",                 kun:"あざ",                 level:1, jlpt:"N5" },
  { k:"名", m:"name / famous",            on:"めい/みょう",         kun:"な",                   level:1, jlpt:"N5" },
  { k:"国", m:"country / nation",         on:"こく",               kun:"くに",                 level:1, jlpt:"N5" },
  { k:"見", m:"see / look / watch",       on:"けん",               kun:"みる/みえる/みせる",    level:1, jlpt:"N5" },
  { k:"聞", m:"hear / listen / ask",      on:"ぶん/もん",           kun:"きく/きこえる",         level:1, jlpt:"N5" },
  { k:"言", m:"say / speak / word",       on:"げん/ごん",           kun:"いう/こと",            level:1, jlpt:"N5" },
  { k:"食", m:"eat / food / meal",        on:"しょく/じき",         kun:"たべる/くう/くらう",    level:1, jlpt:"N5" },
  { k:"飲", m:"drink / swallow",          on:"いん",               kun:"のむ",                 level:1, jlpt:"N5" },
  { k:"行", m:"go / conduct / row",       on:"こう/ぎょう/あん",    kun:"いく/ゆく/おこなう",    level:1, jlpt:"N5" },
  { k:"来", m:"come / arrive",            on:"らい",               kun:"くる/きたる/きたす",    level:1, jlpt:"N5" },
  { k:"出", m:"exit / leave / put out",   on:"しゅつ/すい",         kun:"でる/だす",            level:1, jlpt:"N5" },
  { k:"入", m:"enter / put in",           on:"にゅう",             kun:"いる/いれる/はいる",    level:1, jlpt:"N5" },
  { k:"書", m:"write / book",             on:"しょ",               kun:"かく",                 level:1, jlpt:"N5" },
  { k:"読", m:"read",                     on:"どく/とく/とう",      kun:"よむ",                 level:1, jlpt:"N5" },
  { k:"買", m:"buy / purchase",           on:"ばい",               kun:"かう",                 level:1, jlpt:"N5" },
  { k:"立", m:"stand / rise / set up",    on:"りつ/りゅう",         kun:"たつ/たてる",           level:1, jlpt:"N5" },
  { k:"話", m:"talk / speak / story",     on:"わ",                 kun:"はなす/はなし",         level:1, jlpt:"N5" },
  { k:"休", m:"rest / day off",           on:"きゅう",             kun:"やすむ/やすまる/やすめる",level:1,jlpt:"N5" },
  { k:"大", m:"big / large / great",      on:"だい/たい",           kun:"おお/おおきい/おおいに",level:1, jlpt:"N5" },
  { k:"小", m:"small / little",           on:"しょう",             kun:"ちいさい/こ/お/さ",    level:1, jlpt:"N5" },
  { k:"高", m:"tall / high / expensive",  on:"こう",               kun:"たかい/たか/たかまる/たかめる",level:1,jlpt:"N5" },
  { k:"低", m:"low / short / inferior",   on:"てい",               kun:"ひくい/ひくまる/ひくめる",level:1,jlpt:"N5" },
  { k:"新", m:"new / fresh",              on:"しん",               kun:"あたらしい/あらた/にい",level:1, jlpt:"N5" },
  { k:"古", m:"old / ancient",            on:"こ",                 kun:"ふるい/ふるす",         level:1, jlpt:"N5" },
  { k:"長", m:"long / leader / grow",     on:"ちょう",             kun:"ながい/おさ",           level:1, jlpt:"N5" },
  { k:"白", m:"white / blank",            on:"はく/びゃく",         kun:"しろ/しろい/しら",      level:1, jlpt:"N5" },
  { k:"黒", m:"black / dark",             on:"こく",               kun:"くろ/くろい",           level:1, jlpt:"N5" },
  { k:"赤", m:"red / blush",              on:"せき/しゃく",         kun:"あか/あかい/あかす/あかめる",level:1,jlpt:"N5" },
  { k:"青", m:"blue / green / pale",      on:"せい/しょう",         kun:"あお/あおい",           level:1, jlpt:"N5" },
  { k:"色", m:"colour / colour / type",   on:"しょく/しき",         kun:"いろ",                 level:1, jlpt:"N5" },
  { k:"右", m:"right side",               on:"う/ゆう",            kun:"みぎ",                 level:1, jlpt:"N5" },
  { k:"左", m:"left side",                on:"さ",                 kun:"ひだり",               level:1, jlpt:"N5" },
  { k:"上", m:"up / above / top",         on:"じょう/しょう",       kun:"うえ/うわ/かみ/あがる/あげる",level:1,jlpt:"N5" },
  { k:"下", m:"down / below / under",     on:"か/げ",              kun:"した/しも/くだる/おろす/さがる",level:1,jlpt:"N5" },
  { k:"中", m:"middle / inside / during", on:"ちゅう/じゅう",       kun:"なか",                 level:1, jlpt:"N5" },
  { k:"外", m:"outside / foreign",        on:"がい/げ",            kun:"そと/ほか/はずれる",    level:1, jlpt:"N5" },
  { k:"内", m:"inside / within / home",   on:"ない/だい",           kun:"うち",                 level:1, jlpt:"N5" },
  { k:"東", m:"east",                     on:"とう",               kun:"ひがし",               level:1, jlpt:"N5" },
  { k:"西", m:"west",                     on:"せい/さい",           kun:"にし",                 level:1, jlpt:"N5" },
  { k:"南", m:"south",                    on:"なん/な",            kun:"みなみ",               level:1, jlpt:"N5" },
  { k:"北", m:"north",                    on:"ほく",               kun:"きた",                 level:1, jlpt:"N5" },

  // ══════════════════════════════════════
  // JLPT N4 — Level 2
  // ══════════════════════════════════════
  { k:"朝", m:"morning / dynasty",        on:"ちょう",             kun:"あさ",                 level:2, jlpt:"N4" },
  { k:"夜", m:"night / evening",          on:"や",                 kun:"よる/よ",              level:2, jlpt:"N4" },
  { k:"夕", m:"evening / dusk",           on:"せき",               kun:"ゆう",                 level:2, jlpt:"N4" },
  { k:"昨", m:"yesterday / previous",     on:"さく",               kun:"-",                    level:2, jlpt:"N4" },
  { k:"明", m:"bright / clear / tomorrow",on:"めい/みょう",         kun:"あかるい/あかり/あく/あける/あくる/あかす",level:2,jlpt:"N4" },
  { k:"週", m:"week",                     on:"しゅう",             kun:"-",                    level:2, jlpt:"N4" },
  { k:"間", m:"interval / between / space",on:"かん/けん",          kun:"あいだ/ま",            level:2, jlpt:"N4" },
  { k:"春", m:"spring / youth",           on:"しゅん",             kun:"はる",                 level:2, jlpt:"N4" },
  { k:"夏", m:"summer",                   on:"か/げ",              kun:"なつ",                 level:2, jlpt:"N4" },
  { k:"秋", m:"autumn / fall",            on:"しゅう",             kun:"あき",                 level:2, jlpt:"N4" },
  { k:"冬", m:"winter",                   on:"とう",               kun:"ふゆ",                 level:2, jlpt:"N4" },
  { k:"氷", m:"ice / freeze",             on:"ひょう",             kun:"こおり/こおる/ひ",      level:2, jlpt:"N4" },
  { k:"岩", m:"rock / boulder / crag",    on:"がん",               kun:"いわ",                 level:2, jlpt:"N4" },
  { k:"砂", m:"sand / grit",              on:"さ/しゃ",            kun:"すな",                 level:2, jlpt:"N4" },
  { k:"波", m:"wave / billow",            on:"は",                 kun:"なみ",                 level:2, jlpt:"N4" },
  { k:"湖", m:"lake",                     on:"こ",                 kun:"みずうみ",             level:2, jlpt:"N4" },
  { k:"池", m:"pond / cistern",           on:"ち",                 kun:"いけ",                 level:2, jlpt:"N4" },
  { k:"島", m:"island",                   on:"とう",               kun:"しま",                 level:2, jlpt:"N4" },
  { k:"谷", m:"valley / gorge",           on:"こく",               kun:"たに/や",              level:2, jlpt:"N4" },
  { k:"野", m:"field / plain / wild",     on:"や",                 kun:"の",                   level:2, jlpt:"N4" },
  { k:"星", m:"star / spot",              on:"せい/しょう",         kun:"ほし",                 level:2, jlpt:"N4" },
  { k:"夫", m:"husband / man",            on:"ふ/ふう/ぶ",          kun:"おっと/おとこ",         level:2, jlpt:"N4" },
  { k:"妻", m:"wife / spouse",            on:"さい",               kun:"つま",                 level:2, jlpt:"N4" },
  { k:"息", m:"son / breath / rest",      on:"そく",               kun:"いき",                 level:2, jlpt:"N4" },
  { k:"娘", m:"daughter / girl",          on:"-",                  kun:"むすめ",               level:2, jlpt:"N4" },
  { k:"医", m:"doctor / medicine / heal", on:"い",                 kun:"-",                    level:2, jlpt:"N4" },
  { k:"師", m:"teacher / expert / army",  on:"し",                 kun:"-",                    level:2, jlpt:"N4" },
  { k:"者", m:"person / one who",         on:"しゃ",               kun:"もの",                 level:2, jlpt:"N4" },
  { k:"客", m:"guest / customer / visitor",on:"きゃく/かく",        kun:"-",                    level:2, jlpt:"N4" },
  { k:"主", m:"master / main / owner",    on:"しゅ/す",            kun:"ぬし/おも",            level:2, jlpt:"N4" },
  { k:"会", m:"meeting / association / meet",on:"かい/え",          kun:"あう",                 level:2, jlpt:"N4" },
  { k:"社", m:"company / shrine / society",on:"しゃ",              kun:"やしろ",               level:2, jlpt:"N4" },
  { k:"市", m:"city / market / town",     on:"し",                 kun:"いち",                 level:2, jlpt:"N4" },
  { k:"町", m:"town / city block",        on:"ちょう",             kun:"まち",                 level:2, jlpt:"N4" },
  { k:"村", m:"village / hamlet",         on:"そん",               kun:"むら",                 level:2, jlpt:"N4" },
  { k:"店", m:"shop / store",             on:"てん",               kun:"みせ",                 level:2, jlpt:"N4" },
  { k:"駅", m:"train station",            on:"えき",               kun:"-",                    level:2, jlpt:"N4" },
  { k:"病", m:"illness / disease / sick", on:"びょう/へい",         kun:"やむ/やまい",           level:2, jlpt:"N4" },
  { k:"院", m:"institution / hospital",   on:"いん",               kun:"-",                    level:2, jlpt:"N4" },
  { k:"館", m:"building / hall / mansion",on:"かん",               kun:"-",                    level:2, jlpt:"N4" },
  { k:"道", m:"road / way / path / method",on:"どう/とう",          kun:"みち",                 level:2, jlpt:"N4" },
  { k:"橋", m:"bridge",                   on:"きょう",             kun:"はし",                 level:2, jlpt:"N4" },
  { k:"門", m:"gate / entrance",          on:"もん",               kun:"かど",                 level:2, jlpt:"N4" },
  { k:"園", m:"garden / park / yard",     on:"えん",               kun:"その",                 level:2, jlpt:"N4" },
  { k:"力", m:"power / strength / effort",on:"りょく/りき",         kun:"ちから",               level:2, jlpt:"N4" },
  { k:"気", m:"spirit / energy / feeling",on:"き/け",              kun:"-",                    level:2, jlpt:"N4" },
  { k:"意", m:"intention / meaning / will",on:"い",                kun:"-",                    level:2, jlpt:"N4" },
  { k:"味", m:"taste / flavor / meaning", on:"み",                 kun:"あじ/あじわう",         level:2, jlpt:"N4" },
  { k:"声", m:"voice / sound",            on:"せい/しょう",         kun:"こえ/こわ",            level:2, jlpt:"N4" },
  { k:"音", m:"sound / noise / note",     on:"おん/いん",           kun:"おと/ね",              level:2, jlpt:"N4" },
  { k:"形", m:"shape / form / appearance",on:"けい/ぎょう",         kun:"かたち/かた",          level:2, jlpt:"N4" },
  { k:"数", m:"number / count / several", on:"すう/さく/そく",      kun:"かず/かぞえる",         level:2, jlpt:"N4" },
  { k:"物", m:"thing / object / matter",  on:"ぶつ/もつ",           kun:"もの",                 level:2, jlpt:"N4" },
  { k:"事", m:"matter / thing / fact",    on:"じ/ず",              kun:"こと",                 level:2, jlpt:"N4" },
  { k:"所", m:"place / location",         on:"しょ",               kun:"ところ",               level:2, jlpt:"N4" },
  { k:"方", m:"direction / way / person", on:"ほう",               kun:"かた",                 level:2, jlpt:"N4" },
  { k:"答", m:"answer / reply",           on:"とう",               kun:"こたえる/こたえ",       level:2, jlpt:"N4" },
  { k:"問", m:"question / problem / ask", on:"もん",               kun:"とう/とい/とん",        level:2, jlpt:"N4" },
  { k:"題", m:"topic / title / theme",    on:"だい",               kun:"-",                    level:2, jlpt:"N4" },
  { k:"売", m:"sell / sale",              on:"ばい",               kun:"うる/うれる",           level:2, jlpt:"N4" },
  { k:"走", m:"run / flee",               on:"そう",               kun:"はしる",               level:2, jlpt:"N4" },
  { k:"泳", m:"swim / swimming",          on:"えい",               kun:"およぐ",               level:2, jlpt:"N4" },
  { k:"歩", m:"walk / step / pace",       on:"ほ/ぶ/ふ",           kun:"あるく/あゆむ",         level:2, jlpt:"N4" },
  { k:"待", m:"wait / expect",            on:"たい",               kun:"まつ",                 level:2, jlpt:"N4" },
  { k:"起", m:"wake up / rise / happen",  on:"き",                 kun:"おきる/おこる/おこす",  level:2, jlpt:"N4" },
  { k:"寝", m:"sleep / lie down",         on:"しん",               kun:"ねる/ねかす",           level:2, jlpt:"N4" },
  { k:"着", m:"wear / arrive / stick",    on:"ちゃく/じゃく",       kun:"きる/つく/つける",      level:2, jlpt:"N4" },
  { k:"乗", m:"ride / board / get on",    on:"じょう",             kun:"のる/のせる",           level:2, jlpt:"N4" },
  { k:"降", m:"get off / descend / fall", on:"こう",               kun:"おりる/おろす/ふる",    level:2, jlpt:"N4" },
  { k:"開", m:"open / unfold / start",    on:"かい",               kun:"あく/あける/ひらく/ひらける",level:2,jlpt:"N4" },
  { k:"閉", m:"close / shut",             on:"へい",               kun:"とじる/とじる/しまる/しめる",level:2,jlpt:"N4" },
  { k:"始", m:"begin / start",            on:"し",                 kun:"はじまる/はじめる/はじめ",level:2,jlpt:"N4" },
  { k:"終", m:"end / finish / conclude",  on:"しゅう",             kun:"おわる/おえる",         level:2, jlpt:"N4" },
  { k:"返", m:"return / give back",       on:"へん",               kun:"かえる/かえす",         level:2, jlpt:"N4" },
  { k:"借", m:"borrow / rent",            on:"しゃく",             kun:"かりる",               level:2, jlpt:"N4" },
  { k:"貸", m:"lend / rent out",          on:"たい",               kun:"かす",                 level:2, jlpt:"N4" },
  { k:"教", m:"teach / instruct",         on:"きょう",             kun:"おしえる/おそわる",     level:2, jlpt:"N4" },
  { k:"習", m:"learn / practice / study", on:"しゅう",             kun:"ならう",               level:2, jlpt:"N4" },
  { k:"覚", m:"remember / memorize / feel",on:"かく",              kun:"おぼえる/さます/さめる",level:2, jlpt:"N4" },
  { k:"忘", m:"forget",                   on:"ぼう",               kun:"わすれる",             level:2, jlpt:"N4" },
  { k:"使", m:"use / employ / send",      on:"し",                 kun:"つかう/つかい",         level:2, jlpt:"N4" },
  { k:"働", m:"work / labor",             on:"どう",               kun:"はたらく",             level:2, jlpt:"N4" },
  { k:"遊", m:"play / amuse / be idle",   on:"ゆう/ゆ",            kun:"あそぶ",               level:2, jlpt:"N4" },
  { k:"急", m:"hurry / urgent / sudden",  on:"きゅう",             kun:"いそぐ",               level:2, jlpt:"N4" },
  { k:"助", m:"help / rescue / assist",   on:"じょ",               kun:"たすける/たすかる/すける",level:2,jlpt:"N4" },
  { k:"押", m:"push / press / stamp",     on:"おう",               kun:"おす/おさえる",         level:2, jlpt:"N4" },
  { k:"引", m:"pull / draw / attract",    on:"いん",               kun:"ひく/ひける",           level:2, jlpt:"N4" },
  { k:"洗", m:"wash / rinse / launder",   on:"せん",               kun:"あらう",               level:2, jlpt:"N4" },
  { k:"切", m:"cut / sever / expire",     on:"せつ/さい",           kun:"きる/きれる",           level:2, jlpt:"N4" },
  { k:"強", m:"strong / powerful / force",on:"きょう/ごう",         kun:"つよい/つよまる/しいる",level:2, jlpt:"N4" },
  { k:"弱", m:"weak / feeble / tender",   on:"じゃく",             kun:"よわい/よわる/よわまる",level:2, jlpt:"N4" },
  { k:"速", m:"fast / quick / speed",     on:"そく",               kun:"はやい/はやめる/すみやか",level:2,jlpt:"N4" },
  { k:"遅", m:"slow / late / delay",      on:"ち",                 kun:"おそい/おくれる",       level:2, jlpt:"N4" },
  { k:"広", m:"wide / broad / spacious",  on:"こう",               kun:"ひろい/ひろまる/ひろめる/ひろがる/ひろげる",level:2,jlpt:"N4" },
  { k:"深", m:"deep / profound",          on:"しん",               kun:"ふかい/ふかまる/ふかめる",level:2,jlpt:"N4" },
  { k:"重", m:"heavy / important / pile", on:"じゅう/ちょう",       kun:"おもい/かさなる/かさねる",level:2,jlpt:"N4" },
  { k:"軽", m:"light / easy / nimble",    on:"けい",               kun:"かるい/かろやか",       level:2, jlpt:"N4" },
  { k:"暗", m:"dark / gloomy / dim",      on:"あん",               kun:"くらい/くらむ",         level:2, jlpt:"N4" },
  { k:"太", m:"fat / thick / bold",       on:"た/たい",            kun:"ふとい/ふとる",         level:2, jlpt:"N4" },
  { k:"細", m:"thin / fine / slender",    on:"さい",               kun:"ほそい/ほそる/こまかい/こまか",level:2,jlpt:"N4" },
  { k:"甘", m:"sweet / indulgent",        on:"かん",               kun:"あまい/あまえる/あまやかす",level:2,jlpt:"N4" },
  { k:"辛", m:"spicy / hard / salty",     on:"しん",               kun:"からい/つらい",         level:2, jlpt:"N4" },
  { k:"苦", m:"bitter / suffer / painful",on:"く",                 kun:"くるしい/くるしむ/にがい/にがる",level:2,jlpt:"N4" },
  { k:"楽", m:"fun / ease / comfort",     on:"らく/がく",           kun:"たのしい/たのしむ",     level:2, jlpt:"N4" },
  { k:"夢", m:"dream / vision",           on:"む",                 kun:"ゆめ/ゆめみる",         level:2, jlpt:"N4" },
  { k:"笑", m:"laugh / smile",            on:"しょう",             kun:"わらう/えむ",           level:2, jlpt:"N4" },
  { k:"泣", m:"cry / weep / sob",         on:"きゅう",             kun:"なく",                 level:2, jlpt:"N4" },
  { k:"怖", m:"scared / frightening",     on:"ふ",                 kun:"こわい/こわがる",       level:2, jlpt:"N4" },
  { k:"感", m:"feeling / sense / emotion",on:"かん",               kun:"-",                    level:2, jlpt:"N4" },
  { k:"平", m:"peace / flat / even",      on:"へい/びょう",         kun:"たいら/ひら",           level:2, jlpt:"N4" },
  { k:"和", m:"harmony / Japan / peace",  on:"わ",                 kun:"やわらぐ/やわらげる/なごむ/なごやか",level:2,jlpt:"N4" },
  { k:"全", m:"all / whole / complete",   on:"ぜん",               kun:"すべて/まったく",       level:2, jlpt:"N4" },
  { k:"同", m:"same / similar / equal",   on:"どう",               kun:"おなじ",               level:2, jlpt:"N4" },
  { k:"正", m:"correct / right / justice",on:"せい/しょう",         kun:"ただしい/ただす/まさ",  level:2, jlpt:"N4" },
  { k:"自", m:"self / oneself / natural", on:"じ/し",              kun:"みずから",             level:2, jlpt:"N4" },
  { k:"他", m:"other / another / else",   on:"た",                 kun:"ほか",                 level:2, jlpt:"N4" },
  { k:"理", m:"reason / logic / justice", on:"り",                 kun:"-",                    level:2, jlpt:"N4" },
  { k:"例", m:"example / instance",       on:"れい",               kun:"たとえる",             level:2, jlpt:"N4" },
  { k:"特", m:"special / particular",     on:"とく",               kun:"-",                    level:2, jlpt:"N4" },
  { k:"別", m:"separate / different / special",on:"べつ",          kun:"わかれる",             level:2, jlpt:"N4" },
  { k:"以", m:"by means of / compared with",on:"い",               kun:"-",                    level:2, jlpt:"N4" },

  // ══════════════════════════════════════
  // JLPT N3 — Level 3
  // ══════════════════════════════════════
  { k:"愛", m:"love / affection / care",  on:"あい",               kun:"いとしい/かなしい/めでる",level:3,jlpt:"N3" },
  { k:"怒", m:"anger / rage / be angry",  on:"ど",                 kun:"おこる/いかる",         level:3, jlpt:"N3" },
  { k:"悲", m:"sadness / grief / sorrow", on:"ひ",                 kun:"かなしい/かなしむ",     level:3, jlpt:"N3" },
  { k:"喜", m:"joy / delight / rejoice",  on:"き",                 kun:"よろこぶ/よろこばしい", level:3, jlpt:"N3" },
  { k:"恐", m:"fear / terror / dread",    on:"きょう",             kun:"おそれる/おそろしい",   level:3, jlpt:"N3" },
  { k:"望", m:"hope / desire / wish",     on:"ぼう/もう",           kun:"のぞむ/のぞみ",         level:3, jlpt:"N3" },
  { k:"信", m:"trust / belief / faith",   on:"しん",               kun:"-",                    level:3, jlpt:"N3" },
  { k:"情", m:"emotion / feeling / mercy",on:"じょう/せい",         kun:"なさけ",               level:3, jlpt:"N3" },
  { k:"恥", m:"shame / embarrassment",    on:"ち",                 kun:"はじ/はじる/はずかしい",level:3, jlpt:"N3" },
  { k:"誇", m:"pride / boast / glory",    on:"こ",                 kun:"ほこる",               level:3, jlpt:"N3" },
  { k:"寂", m:"lonely / quiet / desolate",on:"じゃく/せき",         kun:"さびしい/さびれる/さみしい",level:3,jlpt:"N3" },
  { k:"勇", m:"brave / courage / heroic", on:"ゆう",               kun:"いさむ/いさましい",     level:3, jlpt:"N3" },
  { k:"政", m:"politics / government",    on:"せい/しょう",         kun:"まつりごと",           level:3, jlpt:"N3" },
  { k:"法", m:"law / method / way",       on:"ほう/はっ/ほっ",      kun:"-",                    level:3, jlpt:"N3" },
  { k:"税", m:"tax / duty / levy",        on:"ぜい",               kun:"-",                    level:3, jlpt:"N3" },
  { k:"軍", m:"army / military / war",    on:"ぐん",               kun:"-",                    level:3, jlpt:"N3" },
  { k:"戦", m:"war / battle / fight",     on:"せん",               kun:"いくさ/たたかう",       level:3, jlpt:"N3" },
  { k:"際", m:"occasion / boundary / edge",on:"さい",              kun:"きわ",                 level:3, jlpt:"N3" },
  { k:"経", m:"economy / pass through",   on:"けい/きょう",         kun:"へる/たつ",            level:3, jlpt:"N3" },
  { k:"産", m:"produce / birth / property",on:"さん",              kun:"うむ/うまれる/むすめ",  level:3, jlpt:"N3" },
  { k:"業", m:"industry / work / karma",  on:"ぎょう/ごう",         kun:"わざ",                 level:3, jlpt:"N3" },
  { k:"貿", m:"trade / commerce",         on:"ぼう",               kun:"-",                    level:3, jlpt:"N3" },
  { k:"権", m:"right / authority / power",on:"けん/ごん",           kun:"-",                    level:3, jlpt:"N3" },
  { k:"義", m:"justice / morality / meaning",on:"ぎ",              kun:"-",                    level:3, jlpt:"N3" },
  { k:"務", m:"duty / task / serve",      on:"む",                 kun:"つとめる/つとまる",     level:3, jlpt:"N3" },
  { k:"責", m:"responsibility / blame",   on:"せき/さく",           kun:"せめる",               level:3, jlpt:"N3" },
  { k:"港", m:"harbour / port",           on:"こう",               kun:"みなと",               level:3, jlpt:"N3" },
  { k:"滝", m:"waterfall",                on:"ろう",               kun:"たき",                 level:3, jlpt:"N3" },
  { k:"泉", m:"spring / fountain / source",on:"せん",              kun:"いずみ",               level:3, jlpt:"N3" },
  { k:"霧", m:"fog / mist / haze",        on:"む",                 kun:"きり",                 level:3, jlpt:"N3" },
  { k:"虹", m:"rainbow",                  on:"こう",               kun:"にじ",                 level:3, jlpt:"N3" },
  { k:"雷", m:"thunder / lightning",      on:"らい",               kun:"かみなり/いかずち",     level:3, jlpt:"N3" },
  { k:"丘", m:"hill / mound",             on:"きゅう",             kun:"おか",                 level:3, jlpt:"N3" },
  { k:"原", m:"plain / origin / source",  on:"げん/がん",           kun:"はら",                 level:3, jlpt:"N3" },
  { k:"真", m:"truth / genuine / real",   on:"しん",               kun:"ま/まこと",            level:3, jlpt:"N3" },
  { k:"善", m:"good / virtue / goodness", on:"ぜん",               kun:"よい/よくする",         level:3, jlpt:"N3" },
  { k:"悪", m:"evil / bad / wrong",       on:"あく/お",            kun:"わるい/わるさ",         level:3, jlpt:"N3" },
  { k:"美", m:"beauty / beautiful",       on:"び/み",              kun:"うつくしい",           level:3, jlpt:"N3" },
  { k:"差", m:"difference / gap / send",  on:"さ",                 kun:"さす/さし",            level:3, jlpt:"N3" },
  { k:"異", m:"different / strange / unusual",on:"い",             kun:"ことなる/あやしい",     level:3, jlpt:"N3" },
  { k:"誤", m:"error / mistake / wrong",  on:"ご",                 kun:"あやまる/あやまり",     level:3, jlpt:"N3" },
  { k:"決", m:"decide / determine / settle",on:"けつ",             kun:"きめる/きまる",         level:3, jlpt:"N3" },
  { k:"変", m:"change / strange / unusual",on:"へん",              kun:"かわる/かえる/かわり",  level:3, jlpt:"N3" },
  { k:"続", m:"continue / sequel / series",on:"ぞく",              kun:"つづく/つづける",       level:3, jlpt:"N3" },
  { k:"増", m:"increase / gain / add",    on:"ぞう",               kun:"ふえる/ふやす/ます",    level:3, jlpt:"N3" },
  { k:"減", m:"decrease / reduce / less", on:"げん",               kun:"へる/へらす",           level:3, jlpt:"N3" },
  { k:"集", m:"gather / collect / assemble",on:"しゅう",           kun:"あつまる/あつめる/つどう",level:3,jlpt:"N3" },
  { k:"守", m:"protect / guard / keep",   on:"しゅ/す",            kun:"まもる/もり",           level:3, jlpt:"N3" },
  { k:"攻", m:"attack / assault / study", on:"こう",               kun:"せめる",               level:3, jlpt:"N3" },
  { k:"勝", m:"win / victory / excel",    on:"しょう",             kun:"かつ/まさる",           level:3, jlpt:"N3" },
  { k:"負", m:"lose / defeat / bear",     on:"ふ",                 kun:"まける/まかす/おう",    level:3, jlpt:"N3" },
  { k:"争", m:"compete / dispute / fight",on:"そう",               kun:"あらそう",             level:3, jlpt:"N3" },
  { k:"比", m:"compare / ratio",          on:"ひ",                 kun:"くらべる",             level:3, jlpt:"N3" },
  { k:"選", m:"choose / select / elect",  on:"せん",               kun:"えらぶ",               level:3, jlpt:"N3" },
  { k:"捨", m:"throw away / discard",     on:"しゃ",               kun:"すてる",               level:3, jlpt:"N3" },
  { k:"拾", m:"pick up / find / ten",     on:"じゅう/しゅう",       kun:"ひろう",               level:3, jlpt:"N3" },
  { k:"運", m:"carry / luck / fate",      on:"うん",               kun:"はこぶ",               level:3, jlpt:"N3" },
  { k:"移", m:"move / transfer / shift",  on:"い",                 kun:"うつる/うつす",         level:3, jlpt:"N3" },
  { k:"残", m:"remain / leftover / cruel",on:"ざん",               kun:"のこる/のこす",         level:3, jlpt:"N3" },
  { k:"消", m:"disappear / erase / put out",on:"しょう",           kun:"きえる/けす",           level:3, jlpt:"N3" },
  { k:"現", m:"appear / present / current",on:"げん",              kun:"あらわれる/あらわす",   level:3, jlpt:"N3" },
  { k:"隠", m:"hide / conceal / secret",  on:"いん",               kun:"かくれる/かくす",       level:3, jlpt:"N3" },
  { k:"探", m:"search / explore / look for",on:"たん",             kun:"さがす/さぐる",         level:3, jlpt:"N3" },
  { k:"示", m:"show / indicate / reveal", on:"じ/し",              kun:"しめす",               level:3, jlpt:"N3" },
  { k:"腕", m:"arm / skill / ability",    on:"わん",               kun:"うで",                 level:3, jlpt:"N3" },
  { k:"骨", m:"bone / skeleton / effort", on:"こつ",               kun:"ほね",                 level:3, jlpt:"N3" },
  { k:"血", m:"blood / lineage",          on:"けつ",               kun:"ち",                   level:3, jlpt:"N3" },
  { k:"皮", m:"skin / hide / peel",       on:"ひ",                 kun:"かわ",                 level:3, jlpt:"N3" },
  { k:"肩", m:"shoulder",                 on:"けん",               kun:"かた",                 level:3, jlpt:"N3" },
  { k:"胸", m:"chest / breast / heart",   on:"きょう",             kun:"むね/むな",            level:3, jlpt:"N3" },
  { k:"腹", m:"stomach / belly / anger",  on:"ふく",               kun:"はら",                 level:3, jlpt:"N3" },
  { k:"指", m:"finger / point / indicate",on:"し",                 kun:"ゆび/さす",            level:3, jlpt:"N3" },
  { k:"脳", m:"brain / memory / mind",    on:"のう",               kun:"-",                    level:3, jlpt:"N3" },
  { k:"肺", m:"lung",                     on:"はい",               kun:"-",                    level:3, jlpt:"N3" },

  // ══════════════════════════════════════
  // JLPT N2 — Level 4
  // ══════════════════════════════════════
  { k:"概", m:"general / outline / approximate",on:"がい",         kun:"おおむね",             level:4, jlpt:"N2" },
  { k:"論", m:"theory / argument / discuss",on:"ろん",             kun:"-",                    level:4, jlpt:"N2" },
  { k:"証", m:"proof / evidence / certificate",on:"しょう",        kun:"あかす/あかし",         level:4, jlpt:"N2" },
  { k:"批", m:"criticize / comment",       on:"ひ",                kun:"-",                    level:4, jlpt:"N2" },
  { k:"評", m:"evaluate / comment / review",on:"ひょう",           kun:"-",                    level:4, jlpt:"N2" },
  { k:"議", m:"discuss / deliberate / consider",on:"ぎ",           kun:"-",                    level:4, jlpt:"N2" },
  { k:"述", m:"state / mention / narrate", on:"じゅつ",            kun:"のべる",               level:4, jlpt:"N2" },
  { k:"察", m:"guess / inspect / observe", on:"さつ",              kun:"-",                    level:4, jlpt:"N2" },
  { k:"観", m:"view / observe / outlook",  on:"かん",              kun:"-",                    level:4, jlpt:"N2" },
  { k:"測", m:"measure / estimate / survey",on:"そく",             kun:"はかる",               level:4, jlpt:"N2" },
  { k:"検", m:"examine / investigate",     on:"けん",              kun:"-",                    level:4, jlpt:"N2" },
  { k:"査", m:"investigate / inspect",     on:"さ",                kun:"-",                    level:4, jlpt:"N2" },
  { k:"録", m:"record / register / write", on:"ろく",              kun:"-",                    level:4, jlpt:"N2" },
  { k:"映", m:"reflect / project / shine", on:"えい",              kun:"うつる/うつす/はえる",  level:4, jlpt:"N2" },
  { k:"展", m:"expand / exhibit / display",on:"てん",              kun:"-",                    level:4, jlpt:"N2" },
  { k:"演", m:"perform / act / play",      on:"えん",              kun:"-",                    level:4, jlpt:"N2" },
  { k:"術", m:"art / technique / skill",   on:"じゅつ",            kun:"-",                    level:4, jlpt:"N2" },
  { k:"技", m:"skill / technique / ability",on:"ぎ",               kun:"わざ",                 level:4, jlpt:"N2" },
  { k:"械", m:"machine / mechanism",       on:"かい",              kun:"-",                    level:4, jlpt:"N2" },
  { k:"装", m:"equipment / dress / wear",  on:"そう/しょう",        kun:"よそおう",             level:4, jlpt:"N2" },
  { k:"製", m:"manufacture / make / product",on:"せい",            kun:"-",                    level:4, jlpt:"N2" },
  { k:"材", m:"material / timber / talent",on:"ざい",              kun:"-",                    level:4, jlpt:"N2" },
  { k:"資", m:"resources / capital / funds",on:"し",               kun:"-",                    level:4, jlpt:"N2" },
  { k:"費", m:"expense / spend / cost",    on:"ひ",                kun:"ついやす/ついえる",      level:4, jlpt:"N2" },
  { k:"額", m:"amount / forehead / framed picture",on:"がく",      kun:"ひたい",               level:4, jlpt:"N2" },
  { k:"値", m:"price / value / cost",      on:"ち",                kun:"ね/あたい",            level:4, jlpt:"N2" },
  { k:"益", m:"profit / benefit / gain",   on:"えき/やく",          kun:"ます",                 level:4, jlpt:"N2" },
  { k:"損", m:"loss / damage / harm",      on:"そん",              kun:"そこなう/そこねる",     level:4, jlpt:"N2" },
  { k:"傾", m:"lean / incline / tend",     on:"けい",              kun:"かたむく/かたむける",   level:4, jlpt:"N2" },
  { k:"従", m:"obey / follow / accompany", on:"じゅう/しょう/じゅ", kun:"したがう/したがえる",   level:4, jlpt:"N2" },
  { k:"導", m:"lead / guide / conduct",    on:"どう",              kun:"みちびく",             level:4, jlpt:"N2" },
  { k:"促", m:"urge / promote / press",    on:"そく",              kun:"うながす",             level:4, jlpt:"N2" },
  { k:"妨", m:"hinder / obstruct / disturb",on:"ぼう",             kun:"さまたげる",           level:4, jlpt:"N2" },
  { k:"勤", m:"work / diligence / serve",  on:"きん/ごん",          kun:"つとめる/つとまる",     level:4, jlpt:"N2" },
  { k:"奮", m:"stirred / aroused / strive",on:"ふん",              kun:"ふるう",               level:4, jlpt:"N2" },
  { k:"励", m:"encourage / strive / endeavour",on:"れい",          kun:"はげむ/はげます",       level:4, jlpt:"N2" },
  { k:"諦", m:"give up / resign / be clear",on:"てい/たい",         kun:"あきらめる",           level:4, jlpt:"N2" },
  { k:"縮", m:"shrink / shorten / reduce", on:"しゅく",            kun:"ちぢむ/ちぢまる/ちぢめる/ちぢれる",level:4,jlpt:"N2" },
  { k:"拡", m:"expand / enlarge / spread", on:"かく",              kun:"ひろがる/ひろげる",     level:4, jlpt:"N2" },
  { k:"抑", m:"suppress / restrain / hold down",on:"よく",         kun:"おさえる",             level:4, jlpt:"N2" },

  // ══════════════════════════════════════
  // JLPT N1 — Level 5
  // ══════════════════════════════════════
  { k:"憂", m:"melancholy / gloom / grief",on:"ゆう",              kun:"うれえる/うれい/うい",  level:5, jlpt:"N1" },
  { k:"顕", m:"appear / manifest / obvious",on:"けん",             kun:"あらわれる",           level:5, jlpt:"N1" },
  { k:"潜", m:"submerge / lurk / hide",    on:"せん",              kun:"もぐる/ひそむ",         level:5, jlpt:"N1" },
  { k:"錯", m:"confused / mixed / entangled",on:"さく",            kun:"-",                    level:5, jlpt:"N1" },
  { k:"繊", m:"fibre / slender / delicate",on:"せん",              kun:"-",                    level:5, jlpt:"N1" },
  { k:"粛", m:"solemn / austere / strict", on:"しゅく",            kun:"-",                    level:5, jlpt:"N1" },
  { k:"憤", m:"indignant / resentful / angry",on:"ふん",           kun:"いきどおる",           level:5, jlpt:"N1" },
  { k:"嘆", m:"sigh / lament / grieve",    on:"たん",              kun:"なげく/なげかわしい",   level:5, jlpt:"N1" },
  { k:"凄", m:"amazing / terrible / eerie",on:"せい",              kun:"すごい/すごむ/すさまじい",level:5,jlpt:"N1" },
  { k:"卓", m:"table / eminent / excel",   on:"たく",              kun:"-",                    level:5, jlpt:"N1" },
  { k:"騰", m:"rise / jump up / soar",     on:"とう",              kun:"-",                    level:5, jlpt:"N1" },
  { k:"覇", m:"supremacy / rule / dominate",on:"は",               kun:"-",                    level:5, jlpt:"N1" },
  { k:"摂", m:"intake / absorb / take in", on:"せつ",              kun:"-",                    level:5, jlpt:"N1" },
  { k:"懸", m:"hang / risk / stake",       on:"けん/け",           kun:"かける/かかる",         level:5, jlpt:"N1" },
  { k:"遡", m:"go upstream / trace back",  on:"そ",                kun:"さかのぼる",           level:5, jlpt:"N1" },
  { k:"醸", m:"brew / ferment / cause",    on:"じょう",            kun:"かもす",               level:5, jlpt:"N1" },
  { k:"葛", m:"arrowroot / conflict / entangle",on:"かつ",         kun:"くず",                 level:5, jlpt:"N1" },
  { k:"藤", m:"wisteria / purple",         on:"とう",              kun:"ふじ",                 level:5, jlpt:"N1" },
  { k:"濫", m:"overflow / excessive / indiscriminate",on:"らん",   kun:"-",                    level:5, jlpt:"N1" },
  { k:"禍", m:"disaster / evil / misfortune",on:"か",              kun:"わざわい",             level:5, jlpt:"N1" },
  { k:"矜", m:"self-respect / pride / pity",on:"きん/きょう",       kun:"ほこる/つつしむ",       level:5, jlpt:"N1" },
  { k:"斬", m:"slash / behead / cut",      on:"ざん",              kun:"きる",                 level:5, jlpt:"N1" },
  { k:"彙", m:"vocabulary / collect words",on:"い",                kun:"-",                    level:5, jlpt:"N1" },
  { k:"辣", m:"spicy / shrewd / harsh",    on:"らつ",              kun:"-",                    level:5, jlpt:"N1" },
];

// ══════════════════════════════════════
// Hiragana ↔ Romaji conversion
// ══════════════════════════════════════
const HIRA_TO_ROMA: Record<string, string> = {
  "あ":"a","い":"i","う":"u","え":"e","お":"o",
  "か":"ka","き":"ki","く":"ku","け":"ke","こ":"ko",
  "さ":"sa","し":"shi","す":"su","せ":"se","そ":"so",
  "た":"ta","ち":"chi","つ":"tsu","て":"te","と":"to",
  "な":"na","に":"ni","ぬ":"nu","ね":"ne","の":"no",
  "は":"ha","ひ":"hi","ふ":"fu","へ":"he","ほ":"ho",
  "ま":"ma","み":"mi","む":"mu","め":"me","も":"mo",
  "や":"ya","ゆ":"yu","よ":"yo",
  "ら":"ra","り":"ri","る":"ru","れ":"re","ろ":"ro",
  "わ":"wa","を":"wo","ん":"n",
  "が":"ga","ぎ":"gi","ぐ":"gu","げ":"ge","ご":"go",
  "ざ":"za","じ":"ji","ず":"zu","ぜ":"ze","ぞ":"zo",
  "だ":"da","ぢ":"di","づ":"du","で":"de","ど":"do",
  "ば":"ba","び":"bi","ぶ":"bu","べ":"be","ぼ":"bo",
  "ぱ":"pa","ぴ":"pi","ぷ":"pu","ぺ":"pe","ぽ":"po",
  "きゃ":"kya","きゅ":"kyu","きょ":"kyo",
  "しゃ":"sha","しゅ":"shu","しょ":"sho",
  "ちゃ":"cha","ちゅ":"chu","ちょ":"cho",
  "にゃ":"nya","にゅ":"nyu","にょ":"nyo",
  "ひゃ":"hya","ひゅ":"hyu","ひょ":"hyo",
  "みゃ":"mya","みゅ":"myu","みょ":"myo",
  "りゃ":"rya","りゅ":"ryu","りょ":"ryo",
  "ぎゃ":"gya","ぎゅ":"gyu","ぎょ":"gyo",
  "じゃ":"ja","じゅ":"ju","じょ":"jo",
  "びゃ":"bya","びゅ":"byu","びょ":"byo",
  "ぴゃ":"pya","ぴゅ":"pyu","ぴょ":"pyo",
  "ぢゃ":"dya","ぢゅ":"dyu","ぢょ":"dyo",
  "っ":"tt","ー":"-",
};

// Hiragana to Katakana offset
const HIRA_START = 0x3041;
const KATA_START = 0x30A1;

export function hiraToKata(str: string): string {
  return str.split("").map(c => {
    const code = c.charCodeAt(0);
    if (code >= HIRA_START && code <= HIRA_START + 96) {
      return String.fromCharCode(code - HIRA_START + KATA_START);
    }
    return c;
  }).join("");
}

export function hiraToRoma(str: string): string {
  let result = "";
  let i = 0;
  while (i < str.length) {
    const two = str.slice(i, i + 2);
    if (HIRA_TO_ROMA[two]) { result += HIRA_TO_ROMA[two]; i += 2; continue; }
    const one = str[i];
    result += HIRA_TO_ROMA[one] ?? one;
    i++;
  }
  return result;
}

export function kataToHira(str: string): string {
  return str.split("").map(c => {
    const code = c.charCodeAt(0);
    if (code >= KATA_START && code <= KATA_START + 96) {
      return String.fromCharCode(code - KATA_START + HIRA_START);
    }
    return c;
  }).join("");
}

// Accepts: hiragana, katakana, romaji — all variants
export function checkAnswer(input: string, answers: string[]): boolean {
  const clean = input.trim().toLowerCase();
  if (!clean) return false;

  return answers.some(a => {
    // Parse all variants for this answer
    const hira = a.trim().toLowerCase();
    const kata = hiraToKata(hira);
    const roma = hiraToRoma(hira);

    // Direct matches
    if (clean === hira) return true;
    if (clean === kata.toLowerCase()) return true;
    if (clean === roma) return true;

    // If user typed katakana, convert to hiragana and compare
    const inputAsHira = kataToHira(clean);
    if (inputAsHira === hira) return true;

    // If user typed romaji, convert answer romaji and compare
    const inputRoma = hiraToRoma(clean);
    if (inputRoma === roma) return true;

    return false;
  });
}

// Get all valid answers for display (hiragana + romaji)
export function getAnswerHints(answers: string[]): string {
  return answers.map(a => `${a} (${hiraToRoma(a)})`).join(" / ");
}

export function getPool(_category: string): Kanji[] {
  return KANJI_LIST;
}

export function getPoolByElo(elo: number): Kanji[] {
  let maxLevel = 1;
  if (elo >= 1600) maxLevel = 5;
  else if (elo >= 1200) maxLevel = 4;
  else if (elo >= 800) maxLevel = 3;
  else if (elo >= 400) maxLevel = 2;
  return KANJI_LIST.filter(k => k.level <= maxLevel);
}

export function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export type QuestionResult = {
  kanji: Kanji;
  type: QuestionType;
  answers: string[];
  label: string;
};

export function pickQuestion(pool: Kanji[]): QuestionResult {
  const kanji = pool[Math.floor(Math.random() * pool.length)];
  const roll = Math.random();
  let type: QuestionType;
  if (roll < 0.4) type = "meaning";
  else if (roll < 0.7) type = "onyomi";
  else type = "kunyomi";

  let answers: string[] = [];
  let label = "";

  if (type === "meaning") {
    answers = kanji.m.split("/").map(s => s.trim().toLowerCase());
    label = "Meaning";
  } else if (type === "onyomi") {
    if (kanji.on === "-") {
      answers = kanji.m.split("/").map(s => s.trim().toLowerCase());
      type = "meaning"; label = "Meaning";
    } else {
      answers = kanji.on.split("/").map(s => s.trim());
      label = "On'yomi";
    }
  } else {
    if (kanji.kun === "-") {
      answers = kanji.m.split("/").map(s => s.trim().toLowerCase());
      type = "meaning"; label = "Meaning";
    } else {
      answers = kanji.kun.split("/").map(s => s.trim());
      label = "Kun'yomi";
    }
  }

  return { kanji, type, answers, label };
}
