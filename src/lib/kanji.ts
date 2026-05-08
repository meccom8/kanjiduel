export interface Kanji {
  k: string;       // kanji character
  m: string;       // meaning (English)
  on: string;      // on'yomi (sino-japanese reading)
  kun: string;     // kun'yomi (native japanese reading)
  level: number;   // 1=N5 easy ... 5=N1 hard
  jlpt: "N5" | "N4" | "N3" | "N2" | "N1";
}

// Question types for the duel
export type QuestionType = "meaning" | "onyomi" | "kunyomi";

export const KANJI_LIST: Kanji[] = [
  // ════════════════════════════════
  // JLPT N5 — Level 1
  // ════════════════════════════════
  { k:"一", m:"one",          on:"いち",    kun:"ひと",     level:1, jlpt:"N5" },
  { k:"二", m:"two",          on:"に",      kun:"ふた",     level:1, jlpt:"N5" },
  { k:"三", m:"three",        on:"さん",    kun:"みっ",     level:1, jlpt:"N5" },
  { k:"四", m:"four",         on:"し",      kun:"よん",     level:1, jlpt:"N5" },
  { k:"五", m:"five",         on:"ご",      kun:"いつ",     level:1, jlpt:"N5" },
  { k:"六", m:"six",          on:"ろく",    kun:"むっ",     level:1, jlpt:"N5" },
  { k:"七", m:"seven",        on:"しち",    kun:"なな",     level:1, jlpt:"N5" },
  { k:"八", m:"eight",        on:"はち",    kun:"やっ",     level:1, jlpt:"N5" },
  { k:"九", m:"nine",         on:"く",      kun:"ここの",   level:1, jlpt:"N5" },
  { k:"十", m:"ten",          on:"じゅう",  kun:"とお",     level:1, jlpt:"N5" },
  { k:"百", m:"hundred",      on:"ひゃく",  kun:"-",        level:1, jlpt:"N5" },
  { k:"千", m:"thousand",     on:"せん",    kun:"-",        level:1, jlpt:"N5" },
  { k:"万", m:"ten thousand", on:"まん",    kun:"-",        level:1, jlpt:"N5" },
  { k:"円", m:"yen / circle", on:"えん",    kun:"まる",     level:1, jlpt:"N5" },
  { k:"日", m:"sun / day",    on:"にち",    kun:"ひ",       level:1, jlpt:"N5" },
  { k:"月", m:"moon / month", on:"げつ",    kun:"つき",     level:1, jlpt:"N5" },
  { k:"年", m:"year",         on:"ねん",    kun:"とし",     level:1, jlpt:"N5" },
  { k:"時", m:"time / hour",  on:"じ",      kun:"とき",     level:1, jlpt:"N5" },
  { k:"分", m:"minute / part",on:"ふん",    kun:"わ",       level:1, jlpt:"N5" },
  { k:"半", m:"half",         on:"はん",    kun:"-",        level:1, jlpt:"N5" },
  { k:"今", m:"now",          on:"こん",    kun:"いま",     level:1, jlpt:"N5" },
  { k:"前", m:"before / front",on:"ぜん",  kun:"まえ",     level:1, jlpt:"N5" },
  { k:"後", m:"after / behind",on:"ご",    kun:"あと",     level:1, jlpt:"N5" },
  { k:"午", m:"noon",         on:"ご",      kun:"-",        level:1, jlpt:"N5" },
  { k:"毎", m:"every",        on:"まい",    kun:"-",        level:1, jlpt:"N5" },
  { k:"山", m:"mountain",     on:"さん",    kun:"やま",     level:1, jlpt:"N5" },
  { k:"川", m:"river",        on:"せん",    kun:"かわ",     level:1, jlpt:"N5" },
  { k:"木", m:"tree",         on:"もく",    kun:"き",       level:1, jlpt:"N5" },
  { k:"火", m:"fire",         on:"か",      kun:"ひ",       level:1, jlpt:"N5" },
  { k:"水", m:"water",        on:"すい",    kun:"みず",     level:1, jlpt:"N5" },
  { k:"土", m:"earth / soil", on:"ど",      kun:"つち",     level:1, jlpt:"N5" },
  { k:"金", m:"gold / money", on:"きん",    kun:"かね",     level:1, jlpt:"N5" },
  { k:"空", m:"sky / empty",  on:"くう",    kun:"そら",     level:1, jlpt:"N5" },
  { k:"花", m:"flower",       on:"か",      kun:"はな",     level:1, jlpt:"N5" },
  { k:"海", m:"sea / ocean",  on:"かい",    kun:"うみ",     level:1, jlpt:"N5" },
  { k:"石", m:"stone",        on:"せき",    kun:"いし",     level:1, jlpt:"N5" },
  { k:"田", m:"rice field",   on:"でん",    kun:"た",       level:1, jlpt:"N5" },
  { k:"林", m:"forest",       on:"りん",    kun:"はやし",   level:1, jlpt:"N5" },
  { k:"森", m:"woods",        on:"しん",    kun:"もり",     level:1, jlpt:"N5" },
  { k:"雨", m:"rain",         on:"う",      kun:"あめ",     level:1, jlpt:"N5" },
  { k:"風", m:"wind",         on:"ふう",    kun:"かぜ",     level:1, jlpt:"N5" },
  { k:"雪", m:"snow",         on:"せつ",    kun:"ゆき",     level:1, jlpt:"N5" },
  { k:"草", m:"grass",        on:"そう",    kun:"くさ",     level:1, jlpt:"N5" },
  { k:"竹", m:"bamboo",       on:"ちく",    kun:"たけ",     level:1, jlpt:"N5" },
  { k:"虫", m:"insect / bug", on:"ちゅう",  kun:"むし",     level:1, jlpt:"N5" },
  { k:"魚", m:"fish",         on:"ぎょ",    kun:"さかな",   level:1, jlpt:"N5" },
  { k:"鳥", m:"bird",         on:"ちょう",  kun:"とり",     level:1, jlpt:"N5" },
  { k:"犬", m:"dog",          on:"けん",    kun:"いぬ",     level:1, jlpt:"N5" },
  { k:"猫", m:"cat",          on:"びょう",  kun:"ねこ",     level:1, jlpt:"N5" },
  { k:"馬", m:"horse",        on:"ば",      kun:"うま",     level:1, jlpt:"N5" },
  { k:"目", m:"eye",          on:"もく",    kun:"め",       level:1, jlpt:"N5" },
  { k:"口", m:"mouth",        on:"こう",    kun:"くち",     level:1, jlpt:"N5" },
  { k:"耳", m:"ear",          on:"じ",      kun:"みみ",     level:1, jlpt:"N5" },
  { k:"手", m:"hand",         on:"しゅ",    kun:"て",       level:1, jlpt:"N5" },
  { k:"足", m:"foot / leg",   on:"そく",    kun:"あし",     level:1, jlpt:"N5" },
  { k:"頭", m:"head",         on:"とう",    kun:"あたま",   level:1, jlpt:"N5" },
  { k:"心", m:"heart / mind", on:"しん",    kun:"こころ",   level:1, jlpt:"N5" },
  { k:"体", m:"body",         on:"たい",    kun:"からだ",   level:1, jlpt:"N5" },
  { k:"顔", m:"face",         on:"がん",    kun:"かお",     level:1, jlpt:"N5" },
  { k:"毛", m:"hair / fur",   on:"もう",    kun:"け",       level:1, jlpt:"N5" },
  { k:"人", m:"person",       on:"じん",    kun:"ひと",     level:1, jlpt:"N5" },
  { k:"子", m:"child",        on:"し",      kun:"こ",       level:1, jlpt:"N5" },
  { k:"男", m:"man / male",   on:"だん",    kun:"おとこ",   level:1, jlpt:"N5" },
  { k:"女", m:"woman / female",on:"じょ",   kun:"おんな",   level:1, jlpt:"N5" },
  { k:"父", m:"father",       on:"ふ",      kun:"ちち",     level:1, jlpt:"N5" },
  { k:"母", m:"mother",       on:"ぼ",      kun:"はは",     level:1, jlpt:"N5" },
  { k:"兄", m:"older brother",on:"けい",    kun:"あに",     level:1, jlpt:"N5" },
  { k:"姉", m:"older sister", on:"し",      kun:"あね",     level:1, jlpt:"N5" },
  { k:"弟", m:"younger brother",on:"てい",  kun:"おとうと", level:1, jlpt:"N5" },
  { k:"妹", m:"younger sister",on:"まい",   kun:"いもうと", level:1, jlpt:"N5" },
  { k:"友", m:"friend",       on:"ゆう",    kun:"とも",     level:1, jlpt:"N5" },
  { k:"王", m:"king",         on:"おう",    kun:"-",        level:1, jlpt:"N5" },
  { k:"先", m:"previous / ahead",on:"せん", kun:"さき",     level:1, jlpt:"N5" },
  { k:"生", m:"life / birth", on:"せい",    kun:"いき",     level:1, jlpt:"N5" },
  { k:"学", m:"study / learn",on:"がく",    kun:"まな",     level:1, jlpt:"N5" },
  { k:"校", m:"school",       on:"こう",    kun:"-",        level:1, jlpt:"N5" },
  { k:"語", m:"language",     on:"ご",      kun:"かた",     level:1, jlpt:"N5" },
  { k:"文", m:"sentence / text",on:"ぶん",  kun:"ふみ",     level:1, jlpt:"N5" },
  { k:"字", m:"character",    on:"じ",      kun:"あざ",     level:1, jlpt:"N5" },
  { k:"名", m:"name",         on:"めい",    kun:"な",       level:1, jlpt:"N5" },
  { k:"国", m:"country",      on:"こく",    kun:"くに",     level:1, jlpt:"N5" },
  { k:"見", m:"see / look",   on:"けん",    kun:"み",       level:1, jlpt:"N5" },
  { k:"聞", m:"hear / listen",on:"ぶん",    kun:"き",       level:1, jlpt:"N5" },
  { k:"言", m:"say / speak",  on:"げん",    kun:"い",       level:1, jlpt:"N5" },
  { k:"食", m:"eat / food",   on:"しょく",  kun:"た",       level:1, jlpt:"N5" },
  { k:"飲", m:"drink",        on:"いん",    kun:"の",       level:1, jlpt:"N5" },
  { k:"行", m:"go",           on:"こう",    kun:"い",       level:1, jlpt:"N5" },
  { k:"来", m:"come",         on:"らい",    kun:"く",       level:1, jlpt:"N5" },
  { k:"出", m:"exit / leave", on:"しゅつ",  kun:"で",       level:1, jlpt:"N5" },
  { k:"入", m:"enter",        on:"にゅう",  kun:"い",       level:1, jlpt:"N5" },
  { k:"書", m:"write",        on:"しょ",    kun:"か",       level:1, jlpt:"N5" },
  { k:"読", m:"read",         on:"どく",    kun:"よ",       level:1, jlpt:"N5" },
  { k:"買", m:"buy",          on:"ばい",    kun:"か",       level:1, jlpt:"N5" },
  { k:"立", m:"stand",        on:"りつ",    kun:"た",       level:1, jlpt:"N5" },
  { k:"話", m:"talk / speak", on:"わ",      kun:"はな",     level:1, jlpt:"N5" },
  { k:"休", m:"rest",         on:"きゅう",  kun:"やす",     level:1, jlpt:"N5" },
  { k:"大", m:"big / large",  on:"だい",    kun:"おお",     level:1, jlpt:"N5" },
  { k:"小", m:"small / little",on:"しょう", kun:"ちい",     level:1, jlpt:"N5" },
  { k:"高", m:"tall / expensive",on:"こう", kun:"たか",     level:1, jlpt:"N5" },
  { k:"低", m:"low / short",  on:"てい",    kun:"ひく",     level:1, jlpt:"N5" },
  { k:"新", m:"new",          on:"しん",    kun:"あたら",   level:1, jlpt:"N5" },
  { k:"古", m:"old",          on:"こ",      kun:"ふる",     level:1, jlpt:"N5" },
  { k:"長", m:"long / leader",on:"ちょう",  kun:"なが",     level:1, jlpt:"N5" },
  { k:"白", m:"white",        on:"はく",    kun:"しろ",     level:1, jlpt:"N5" },
  { k:"黒", m:"black",        on:"こく",    kun:"くろ",     level:1, jlpt:"N5" },
  { k:"赤", m:"red",          on:"せき",    kun:"あか",     level:1, jlpt:"N5" },
  { k:"青", m:"blue",         on:"せい",    kun:"あお",     level:1, jlpt:"N5" },
  { k:"色", m:"colour",       on:"しょく",  kun:"いろ",     level:1, jlpt:"N5" },
  { k:"右", m:"right",        on:"う",      kun:"みぎ",     level:1, jlpt:"N5" },
  { k:"左", m:"left",         on:"さ",      kun:"ひだり",   level:1, jlpt:"N5" },
  { k:"上", m:"up / above",   on:"じょう",  kun:"うえ",     level:1, jlpt:"N5" },
  { k:"下", m:"down / below", on:"か",      kun:"した",     level:1, jlpt:"N5" },
  { k:"中", m:"middle / inside",on:"ちゅう",kun:"なか",     level:1, jlpt:"N5" },
  { k:"外", m:"outside",      on:"がい",    kun:"そと",     level:1, jlpt:"N5" },
  { k:"内", m:"inside",       on:"ない",    kun:"うち",     level:1, jlpt:"N5" },
  { k:"東", m:"east",         on:"とう",    kun:"ひがし",   level:1, jlpt:"N5" },
  { k:"西", m:"west",         on:"せい",    kun:"にし",     level:1, jlpt:"N5" },
  { k:"南", m:"south",        on:"なん",    kun:"みなみ",   level:1, jlpt:"N5" },
  { k:"北", m:"north",        on:"ほく",    kun:"きた",     level:1, jlpt:"N5" },

  // ════════════════════════════════
  // JLPT N4 — Level 2
  // ════════════════════════════════
  { k:"朝", m:"morning",      on:"ちょう",  kun:"あさ",     level:2, jlpt:"N4" },
  { k:"夜", m:"night",        on:"や",      kun:"よる",     level:2, jlpt:"N4" },
  { k:"夕", m:"evening",      on:"せき",    kun:"ゆう",     level:2, jlpt:"N4" },
  { k:"昨", m:"yesterday",    on:"さく",    kun:"-",        level:2, jlpt:"N4" },
  { k:"明", m:"bright / tomorrow",on:"めい",kun:"あか",     level:2, jlpt:"N4" },
  { k:"週", m:"week",         on:"しゅう",  kun:"-",        level:2, jlpt:"N4" },
  { k:"間", m:"interval / between",on:"かん",kun:"あいだ",  level:2, jlpt:"N4" },
  { k:"春", m:"spring",       on:"しゅん",  kun:"はる",     level:2, jlpt:"N4" },
  { k:"夏", m:"summer",       on:"か",      kun:"なつ",     level:2, jlpt:"N4" },
  { k:"秋", m:"autumn / fall",on:"しゅう",  kun:"あき",     level:2, jlpt:"N4" },
  { k:"冬", m:"winter",       on:"とう",    kun:"ふゆ",     level:2, jlpt:"N4" },
  { k:"氷", m:"ice",          on:"ひょう",  kun:"こおり",   level:2, jlpt:"N4" },
  { k:"岩", m:"rock / boulder",on:"がん",   kun:"いわ",     level:2, jlpt:"N4" },
  { k:"砂", m:"sand",         on:"さ",      kun:"すな",     level:2, jlpt:"N4" },
  { k:"波", m:"wave",         on:"は",      kun:"なみ",     level:2, jlpt:"N4" },
  { k:"湖", m:"lake",         on:"こ",      kun:"みずうみ", level:2, jlpt:"N4" },
  { k:"池", m:"pond",         on:"ち",      kun:"いけ",     level:2, jlpt:"N4" },
  { k:"島", m:"island",       on:"とう",    kun:"しま",     level:2, jlpt:"N4" },
  { k:"谷", m:"valley",       on:"こく",    kun:"たに",     level:2, jlpt:"N4" },
  { k:"野", m:"field / plain",on:"や",      kun:"の",       level:2, jlpt:"N4" },
  { k:"星", m:"star",         on:"せい",    kun:"ほし",     level:2, jlpt:"N4" },
  { k:"夫", m:"husband",      on:"ふ",      kun:"おっと",   level:2, jlpt:"N4" },
  { k:"妻", m:"wife",         on:"さい",    kun:"つま",     level:2, jlpt:"N4" },
  { k:"息", m:"son / breath", on:"そく",    kun:"いき",     level:2, jlpt:"N4" },
  { k:"娘", m:"daughter",     on:"-",       kun:"むすめ",   level:2, jlpt:"N4" },
  { k:"医", m:"doctor / medicine",on:"い",  kun:"-",        level:2, jlpt:"N4" },
  { k:"師", m:"teacher / expert",on:"し",   kun:"-",        level:2, jlpt:"N4" },
  { k:"者", m:"person / expert",on:"しゃ",  kun:"もの",     level:2, jlpt:"N4" },
  { k:"客", m:"guest / customer",on:"きゃく",kun:"-",       level:2, jlpt:"N4" },
  { k:"主", m:"master / main",on:"しゅ",    kun:"ぬし",     level:2, jlpt:"N4" },
  { k:"会", m:"meeting / association",on:"かい",kun:"あ",   level:2, jlpt:"N4" },
  { k:"社", m:"company / shrine",on:"しゃ", kun:"-",        level:2, jlpt:"N4" },
  { k:"市", m:"city / market",on:"し",      kun:"いち",     level:2, jlpt:"N4" },
  { k:"町", m:"town",         on:"ちょう",  kun:"まち",     level:2, jlpt:"N4" },
  { k:"村", m:"village",      on:"そん",    kun:"むら",     level:2, jlpt:"N4" },
  { k:"店", m:"shop / store", on:"てん",    kun:"みせ",     level:2, jlpt:"N4" },
  { k:"駅", m:"station",      on:"えき",    kun:"-",        level:2, jlpt:"N4" },
  { k:"病", m:"illness",      on:"びょう",  kun:"やまい",   level:2, jlpt:"N4" },
  { k:"院", m:"institution",  on:"いん",    kun:"-",        level:2, jlpt:"N4" },
  { k:"館", m:"building / hall",on:"かん",  kun:"-",        level:2, jlpt:"N4" },
  { k:"道", m:"road / way",   on:"どう",    kun:"みち",     level:2, jlpt:"N4" },
  { k:"橋", m:"bridge",       on:"きょう",  kun:"はし",     level:2, jlpt:"N4" },
  { k:"門", m:"gate",         on:"もん",    kun:"かど",     level:2, jlpt:"N4" },
  { k:"園", m:"garden / park",on:"えん",    kun:"その",     level:2, jlpt:"N4" },
  { k:"力", m:"power / strength",on:"りょく",kun:"ちから",  level:2, jlpt:"N4" },
  { k:"気", m:"spirit / energy",on:"き",    kun:"-",        level:2, jlpt:"N4" },
  { k:"意", m:"intention / meaning",on:"い",kun:"-",        level:2, jlpt:"N4" },
  { k:"味", m:"taste / meaning",on:"み",    kun:"あじ",     level:2, jlpt:"N4" },
  { k:"声", m:"voice",        on:"せい",    kun:"こえ",     level:2, jlpt:"N4" },
  { k:"音", m:"sound",        on:"おん",    kun:"おと",     level:2, jlpt:"N4" },
  { k:"形", m:"shape / form", on:"けい",    kun:"かたち",   level:2, jlpt:"N4" },
  { k:"数", m:"number / count",on:"すう",   kun:"かず",     level:2, jlpt:"N4" },
  { k:"物", m:"thing / object",on:"ぶつ",   kun:"もの",     level:2, jlpt:"N4" },
  { k:"事", m:"matter / thing",on:"じ",     kun:"こと",     level:2, jlpt:"N4" },
  { k:"所", m:"place",        on:"しょ",    kun:"ところ",   level:2, jlpt:"N4" },
  { k:"方", m:"direction / way",on:"ほう",  kun:"かた",     level:2, jlpt:"N4" },
  { k:"答", m:"answer",       on:"とう",    kun:"こた",     level:2, jlpt:"N4" },
  { k:"問", m:"question / problem",on:"もん",kun:"と",      level:2, jlpt:"N4" },
  { k:"題", m:"topic / title",on:"だい",    kun:"-",        level:2, jlpt:"N4" },
  { k:"売", m:"sell",         on:"ばい",    kun:"う",       level:2, jlpt:"N4" },
  { k:"走", m:"run",          on:"そう",    kun:"はし",     level:2, jlpt:"N4" },
  { k:"泳", m:"swim",         on:"えい",    kun:"およ",     level:2, jlpt:"N4" },
  { k:"歩", m:"walk",         on:"ほ",      kun:"ある",     level:2, jlpt:"N4" },
  { k:"待", m:"wait",         on:"たい",    kun:"ま",       level:2, jlpt:"N4" },
  { k:"起", m:"wake up / rise",on:"き",     kun:"お",       level:2, jlpt:"N4" },
  { k:"寝", m:"sleep",        on:"しん",    kun:"ね",       level:2, jlpt:"N4" },
  { k:"着", m:"wear / arrive",on:"ちゃく",  kun:"き",       level:2, jlpt:"N4" },
  { k:"乗", m:"ride / board", on:"じょう",  kun:"の",       level:2, jlpt:"N4" },
  { k:"降", m:"get off / fall",on:"こう",   kun:"お",       level:2, jlpt:"N4" },
  { k:"開", m:"open",         on:"かい",    kun:"あ",       level:2, jlpt:"N4" },
  { k:"閉", m:"close / shut", on:"へい",    kun:"し",       level:2, jlpt:"N4" },
  { k:"始", m:"begin / start",on:"し",      kun:"はじ",     level:2, jlpt:"N4" },
  { k:"終", m:"end / finish", on:"しゅう",  kun:"お",       level:2, jlpt:"N4" },
  { k:"返", m:"return",       on:"へん",    kun:"かえ",     level:2, jlpt:"N4" },
  { k:"借", m:"borrow",       on:"しゃく",  kun:"か",       level:2, jlpt:"N4" },
  { k:"貸", m:"lend",         on:"たい",    kun:"か",       level:2, jlpt:"N4" },
  { k:"教", m:"teach",        on:"きょう",  kun:"おし",     level:2, jlpt:"N4" },
  { k:"習", m:"learn / practice",on:"しゅう",kun:"なら",    level:2, jlpt:"N4" },
  { k:"覚", m:"remember",     on:"かく",    kun:"おぼ",     level:2, jlpt:"N4" },
  { k:"忘", m:"forget",       on:"ぼう",    kun:"わす",     level:2, jlpt:"N4" },
  { k:"使", m:"use",          on:"し",      kun:"つか",     level:2, jlpt:"N4" },
  { k:"働", m:"work",         on:"どう",    kun:"はたら",   level:2, jlpt:"N4" },
  { k:"遊", m:"play",         on:"ゆう",    kun:"あそ",     level:2, jlpt:"N4" },
  { k:"急", m:"hurry / urgent",on:"きゅう", kun:"いそ",     level:2, jlpt:"N4" },
  { k:"助", m:"help / rescue",on:"じょ",    kun:"たす",     level:2, jlpt:"N4" },
  { k:"押", m:"push",         on:"おう",    kun:"お",       level:2, jlpt:"N4" },
  { k:"引", m:"pull",         on:"いん",    kun:"ひ",       level:2, jlpt:"N4" },
  { k:"洗", m:"wash",         on:"せん",    kun:"あら",     level:2, jlpt:"N4" },
  { k:"切", m:"cut",          on:"せつ",    kun:"き",       level:2, jlpt:"N4" },
  { k:"強", m:"strong",       on:"きょう",  kun:"つよ",     level:2, jlpt:"N4" },
  { k:"弱", m:"weak",         on:"じゃく",  kun:"よわ",     level:2, jlpt:"N4" },
  { k:"速", m:"fast / quick", on:"そく",    kun:"はや",     level:2, jlpt:"N4" },
  { k:"遅", m:"slow / late",  on:"ち",      kun:"おそ",     level:2, jlpt:"N4" },
  { k:"広", m:"wide / broad", on:"こう",    kun:"ひろ",     level:2, jlpt:"N4" },
  { k:"深", m:"deep",         on:"しん",    kun:"ふか",     level:2, jlpt:"N4" },
  { k:"重", m:"heavy / important",on:"じゅう",kun:"おも",   level:2, jlpt:"N4" },
  { k:"軽", m:"light / easy", on:"けい",    kun:"かる",     level:2, jlpt:"N4" },
  { k:"暗", m:"dark",         on:"あん",    kun:"くら",     level:2, jlpt:"N4" },
  { k:"太", m:"fat / thick",  on:"た",      kun:"ふと",     level:2, jlpt:"N4" },
  { k:"細", m:"thin / fine",  on:"さい",    kun:"ほそ",     level:2, jlpt:"N4" },
  { k:"甘", m:"sweet",        on:"かん",    kun:"あま",     level:2, jlpt:"N4" },
  { k:"辛", m:"spicy / hard", on:"しん",    kun:"から",     level:2, jlpt:"N4" },
  { k:"苦", m:"bitter / suffer",on:"く",    kun:"にが",     level:2, jlpt:"N4" },
  { k:"楽", m:"fun / comfort",on:"らく",    kun:"たの",     level:2, jlpt:"N4" },
  { k:"夢", m:"dream",        on:"む",      kun:"ゆめ",     level:2, jlpt:"N4" },
  { k:"笑", m:"laugh / smile",on:"しょう",  kun:"わら",     level:2, jlpt:"N4" },
  { k:"泣", m:"cry / weep",   on:"きゅう",  kun:"な",       level:2, jlpt:"N4" },
  { k:"怖", m:"scared / fear",on:"ふ",      kun:"こわ",     level:2, jlpt:"N4" },
  { k:"感", m:"feeling / sense",on:"かん",  kun:"-",        level:2, jlpt:"N4" },
  { k:"平", m:"peace / flat", on:"へい",    kun:"たい",     level:2, jlpt:"N4" },
  { k:"和", m:"harmony / Japan",on:"わ",    kun:"やわ",     level:2, jlpt:"N4" },
  { k:"全", m:"all / complete",on:"ぜん",   kun:"すべ",     level:2, jlpt:"N4" },
  { k:"同", m:"same",         on:"どう",    kun:"おな",     level:2, jlpt:"N4" },
  { k:"正", m:"correct / right",on:"せい",  kun:"ただ",     level:2, jlpt:"N4" },
  { k:"自", m:"self",         on:"じ",      kun:"みずか",   level:2, jlpt:"N4" },
  { k:"他", m:"other",        on:"た",      kun:"ほか",     level:2, jlpt:"N4" },
  { k:"理", m:"reason / logic",on:"り",     kun:"-",        level:2, jlpt:"N4" },
  { k:"例", m:"example",      on:"れい",    kun:"たと",     level:2, jlpt:"N4" },
  { k:"特", m:"special",      on:"とく",    kun:"-",        level:2, jlpt:"N4" },
  { k:"別", m:"separate / different",on:"べつ",kun:"わか",  level:2, jlpt:"N4" },
  { k:"以", m:"by means of",  on:"い",      kun:"-",        level:2, jlpt:"N4" },

  // ════════════════════════════════
  // JLPT N3 — Level 3
  // ════════════════════════════════
  { k:"愛", m:"love / affection",on:"あい",  kun:"いと",    level:3, jlpt:"N3" },
  { k:"怒", m:"anger / rage", on:"ど",      kun:"おこ",     level:3, jlpt:"N3" },
  { k:"悲", m:"sadness / grief",on:"ひ",    kun:"かな",     level:3, jlpt:"N3" },
  { k:"喜", m:"joy / delight",on:"き",      kun:"よろこ",   level:3, jlpt:"N3" },
  { k:"恐", m:"fear / terror",on:"きょう",  kun:"おそ",     level:3, jlpt:"N3" },
  { k:"望", m:"hope / desire",on:"ぼう",    kun:"のぞ",     level:3, jlpt:"N3" },
  { k:"信", m:"trust / believe",on:"しん",  kun:"-",        level:3, jlpt:"N3" },
  { k:"情", m:"emotion / feeling",on:"じょう",kun:"なさ",   level:3, jlpt:"N3" },
  { k:"恥", m:"shame / embarrass",on:"ち",  kun:"はじ",     level:3, jlpt:"N3" },
  { k:"誇", m:"pride / boast",on:"こ",      kun:"ほこ",     level:3, jlpt:"N3" },
  { k:"寂", m:"lonely / quiet",on:"じゃく", kun:"さび",     level:3, jlpt:"N3" },
  { k:"勇", m:"brave / courage",on:"ゆう",  kun:"いさ",     level:3, jlpt:"N3" },
  { k:"政", m:"politics / government",on:"せい",kun:"まつり",level:3,jlpt:"N3" },
  { k:"法", m:"law / method", on:"ほう",    kun:"-",        level:3, jlpt:"N3" },
  { k:"税", m:"tax",          on:"ぜい",    kun:"-",        level:3, jlpt:"N3" },
  { k:"軍", m:"army / military",on:"ぐん",  kun:"-",        level:3, jlpt:"N3" },
  { k:"戦", m:"war / battle", on:"せん",    kun:"たたか",   level:3, jlpt:"N3" },
  { k:"際", m:"occasion / boundary",on:"さい",kun:"きわ",   level:3, jlpt:"N3" },
  { k:"経", m:"economy / pass",on:"けい",   kun:"へ",       level:3, jlpt:"N3" },
  { k:"産", m:"produce / birth",on:"さん",  kun:"う",       level:3, jlpt:"N3" },
  { k:"業", m:"industry / work",on:"ぎょう",kun:"わざ",     level:3, jlpt:"N3" },
  { k:"貿", m:"trade / commerce",on:"ぼう", kun:"-",        level:3, jlpt:"N3" },
  { k:"権", m:"right / authority",on:"けん",kun:"-",        level:3, jlpt:"N3" },
  { k:"義", m:"justice / meaning",on:"ぎ",  kun:"-",        level:3, jlpt:"N3" },
  { k:"務", m:"duty / task",  on:"む",      kun:"つと",     level:3, jlpt:"N3" },
  { k:"責", m:"responsibility",on:"せき",   kun:"せ",       level:3, jlpt:"N3" },
  { k:"港", m:"harbour / port",on:"こう",   kun:"みなと",   level:3, jlpt:"N3" },
  { k:"滝", m:"waterfall",    on:"ろう",    kun:"たき",     level:3, jlpt:"N3" },
  { k:"泉", m:"spring / fountain",on:"せん",kun:"いずみ",   level:3, jlpt:"N3" },
  { k:"霧", m:"fog / mist",   on:"む",      kun:"きり",     level:3, jlpt:"N3" },
  { k:"虹", m:"rainbow",      on:"こう",    kun:"にじ",     level:3, jlpt:"N3" },
  { k:"雷", m:"thunder / lightning",on:"らい",kun:"かみなり",level:3,jlpt:"N3" },
  { k:"丘", m:"hill",         on:"きゅう",  kun:"おか",     level:3, jlpt:"N3" },
  { k:"原", m:"plain / origin",on:"げん",   kun:"はら",     level:3, jlpt:"N3" },
  { k:"真", m:"truth / genuine",on:"しん",  kun:"ま",       level:3, jlpt:"N3" },
  { k:"善", m:"good / virtue",on:"ぜん",    kun:"よ",       level:3, jlpt:"N3" },
  { k:"悪", m:"evil / bad",   on:"あく",    kun:"わる",     level:3, jlpt:"N3" },
  { k:"美", m:"beauty",       on:"び",      kun:"うつく",   level:3, jlpt:"N3" },
  { k:"差", m:"difference",   on:"さ",      kun:"さ",       level:3, jlpt:"N3" },
  { k:"異", m:"different / strange",on:"い",kun:"こと",     level:3, jlpt:"N3" },
  { k:"誤", m:"error / mistake",on:"ご",    kun:"あやま",   level:3, jlpt:"N3" },
  { k:"決", m:"decide / determine",on:"けつ",kun:"き",      level:3, jlpt:"N3" },
  { k:"変", m:"change / strange",on:"へん", kun:"か",       level:3, jlpt:"N3" },
  { k:"続", m:"continue",     on:"ぞく",    kun:"つづ",     level:3, jlpt:"N3" },
  { k:"増", m:"increase",     on:"ぞう",    kun:"ふ",       level:3, jlpt:"N3" },
  { k:"減", m:"decrease",     on:"げん",    kun:"へ",       level:3, jlpt:"N3" },
  { k:"集", m:"gather / collect",on:"しゅう",kun:"あつ",    level:3, jlpt:"N3" },
  { k:"守", m:"protect / guard",on:"しゅ",  kun:"まも",     level:3, jlpt:"N3" },
  { k:"攻", m:"attack",       on:"こう",    kun:"せ",       level:3, jlpt:"N3" },
  { k:"勝", m:"win / victory",on:"しょう",  kun:"か",       level:3, jlpt:"N3" },
  { k:"負", m:"lose / defeat",on:"ふ",      kun:"ま",       level:3, jlpt:"N3" },
  { k:"争", m:"compete / dispute",on:"そう",kun:"あらそ",   level:3, jlpt:"N3" },
  { k:"比", m:"compare",      on:"ひ",      kun:"くら",     level:3, jlpt:"N3" },
  { k:"選", m:"choose / elect",on:"せん",   kun:"えら",     level:3, jlpt:"N3" },
  { k:"捨", m:"throw away",   on:"しゃ",    kun:"す",       level:3, jlpt:"N3" },
  { k:"拾", m:"pick up",      on:"じゅう",  kun:"ひろ",     level:3, jlpt:"N3" },
  { k:"運", m:"carry / luck", on:"うん",    kun:"はこ",     level:3, jlpt:"N3" },
  { k:"移", m:"move / transfer",on:"い",    kun:"うつ",     level:3, jlpt:"N3" },
  { k:"残", m:"remain / leftover",on:"ざん",kun:"のこ",     level:3, jlpt:"N3" },
  { k:"消", m:"disappear / erase",on:"しょう",kun:"き",     level:3, jlpt:"N3" },
  { k:"現", m:"appear / present",on:"げん", kun:"あらわ",   level:3, jlpt:"N3" },
  { k:"隠", m:"hide / conceal",on:"いん",   kun:"かく",     level:3, jlpt:"N3" },
  { k:"探", m:"search / explore",on:"たん", kun:"さが",     level:3, jlpt:"N3" },
  { k:"示", m:"show / indicate",on:"じ",    kun:"しめ",     level:3, jlpt:"N3" },
  { k:"頃", m:"about / around that time",on:"けい",kun:"ころ",level:3,jlpt:"N3"},
  { k:"瞬", m:"instant / blink",on:"しゅん",kun:"またた",   level:3, jlpt:"N3" },
  { k:"腕", m:"arm",          on:"わん",    kun:"うで",     level:3, jlpt:"N3" },
  { k:"骨", m:"bone",         on:"こつ",    kun:"ほね",     level:3, jlpt:"N3" },
  { k:"血", m:"blood",        on:"けつ",    kun:"ち",       level:3, jlpt:"N3" },
  { k:"皮", m:"skin / hide",  on:"ひ",      kun:"かわ",     level:3, jlpt:"N3" },
  { k:"肩", m:"shoulder",     on:"けん",    kun:"かた",     level:3, jlpt:"N3" },
  { k:"胸", m:"chest / breast",on:"きょう", kun:"むね",     level:3, jlpt:"N3" },
  { k:"腹", m:"stomach / belly",on:"ふく",  kun:"はら",     level:3, jlpt:"N3" },
  { k:"指", m:"finger / point",on:"し",     kun:"ゆび",     level:3, jlpt:"N3" },
  { k:"脳", m:"brain",        on:"のう",    kun:"-",        level:3, jlpt:"N3" },
  { k:"肺", m:"lung",         on:"はい",    kun:"-",        level:3, jlpt:"N3" },

  // ════════════════════════════════
  // JLPT N2 — Level 4
  // ════════════════════════════════
  { k:"概", m:"general / outline",on:"がい",kun:"おおむ",   level:4, jlpt:"N2" },
  { k:"論", m:"theory / argue",on:"ろん",   kun:"-",        level:4, jlpt:"N2" },
  { k:"証", m:"proof / evidence",on:"しょう",kun:"あか",    level:4, jlpt:"N2" },
  { k:"批", m:"criticize",    on:"ひ",      kun:"-",        level:4, jlpt:"N2" },
  { k:"評", m:"evaluate / comment",on:"ひょう",kun:"-",     level:4, jlpt:"N2" },
  { k:"議", m:"discuss / deliberate",on:"ぎ",kun:"-",       level:4, jlpt:"N2" },
  { k:"述", m:"state / mention",on:"じゅつ",kun:"の",       level:4, jlpt:"N2" },
  { k:"察", m:"guess / inspect",on:"さつ",  kun:"-",        level:4, jlpt:"N2" },
  { k:"観", m:"view / observe",on:"かん",   kun:"-",        level:4, jlpt:"N2" },
  { k:"象", m:"elephant / symbol",on:"しょう",kun:"-",      level:4, jlpt:"N2" },
  { k:"測", m:"measure / estimate",on:"そく",kun:"はか",    level:4, jlpt:"N2" },
  { k:"検", m:"examine / investigate",on:"けん",kun:"-",    level:4, jlpt:"N2" },
  { k:"査", m:"investigate",  on:"さ",      kun:"-",        level:4, jlpt:"N2" },
  { k:"録", m:"record",       on:"ろく",    kun:"-",        level:4, jlpt:"N2" },
  { k:"映", m:"reflect / project",on:"えい",kun:"うつ",     level:4, jlpt:"N2" },
  { k:"展", m:"expand / exhibit",on:"てん", kun:"-",        level:4, jlpt:"N2" },
  { k:"示", m:"indicate",     on:"じ",      kun:"しめ",     level:4, jlpt:"N2" },
  { k:"演", m:"perform / act",on:"えん",    kun:"-",        level:4, jlpt:"N2" },
  { k:"術", m:"art / technique",on:"じゅつ",kun:"-",        level:4, jlpt:"N2" },
  { k:"技", m:"skill / technique",on:"ぎ",  kun:"わざ",     level:4, jlpt:"N2" },
  { k:"械", m:"machine",      on:"かい",    kun:"-",        level:4, jlpt:"N2" },
  { k:"装", m:"equipment / dress",on:"そう",kun:"よそお",   level:4, jlpt:"N2" },
  { k:"製", m:"manufacture",  on:"せい",    kun:"-",        level:4, jlpt:"N2" },
  { k:"材", m:"material / timber",on:"ざい",kun:"-",        level:4, jlpt:"N2" },
  { k:"資", m:"resources",    on:"し",      kun:"-",        level:4, jlpt:"N2" },
  { k:"費", m:"expense / spend",on:"ひ",    kun:"つい",     level:4, jlpt:"N2" },
  { k:"額", m:"amount / forehead",on:"がく",kun:"ひたい",   level:4, jlpt:"N2" },
  { k:"値", m:"price / value",on:"ち",      kun:"ね",       level:4, jlpt:"N2" },
  { k:"益", m:"profit / benefit",on:"えき", kun:"ます",     level:4, jlpt:"N2" },
  { k:"損", m:"loss / damage",on:"そん",    kun:"-",        level:4, jlpt:"N2" },
  { k:"傾", m:"lean / incline",on:"けい",   kun:"かたむ",   level:4, jlpt:"N2" },
  { k:"従", m:"obey / follow",on:"じゅう",  kun:"したが",   level:4, jlpt:"N2" },
  { k:"導", m:"lead / guide", on:"どう",    kun:"みちび",   level:4, jlpt:"N2" },
  { k:"促", m:"urge / promote",on:"そく",   kun:"うなが",   level:4, jlpt:"N2" },
  { k:"妨", m:"hinder / obstruct",on:"ぼう",kun:"さまた",   level:4, jlpt:"N2" },
  { k:"妥", m:"suitable / proper",on:"だ",  kun:"-",        level:4, jlpt:"N2" },
  { k:"勤", m:"work / diligence",on:"きん", kun:"つと",     level:4, jlpt:"N2" },
  { k:"奮", m:"stirred / roused",on:"ふん", kun:"ふる",     level:4, jlpt:"N2" },
  { k:"励", m:"encourage",    on:"れい",    kun:"はげ",     level:4, jlpt:"N2" },
  { k:"諦", m:"give up / resign",on:"てい", kun:"あきら",   level:4, jlpt:"N2" },

  // ════════════════════════════════
  // JLPT N1 — Level 5
  // ════════════════════════════════
  { k:"彙", m:"vocabulary",   on:"い",      kun:"-",        level:5, jlpt:"N1" },
  { k:"辣", m:"spicy / shrewd",on:"らつ",   kun:"-",        level:5, jlpt:"N1" },
  { k:"憂", m:"melancholy / gloom",on:"ゆう",kun:"うれ",    level:5, jlpt:"N1" },
  { k:"顕", m:"appear / manifest",on:"けん",kun:"あらわ",   level:5, jlpt:"N1" },
  { k:"潜", m:"submerge / lurk",on:"せん",  kun:"もぐ",     level:5, jlpt:"N1" },
  { k:"錯", m:"confused / mixed",on:"さく", kun:"-",        level:5, jlpt:"N1" },
  { k:"繊", m:"fibre / slender",on:"せん",  kun:"-",        level:5, jlpt:"N1" },
  { k:"粛", m:"solemn / austere",on:"しゅく",kun:"-",       level:5, jlpt:"N1" },
  { k:"憤", m:"indignant",    on:"ふん",    kun:"いきどお",  level:5, jlpt:"N1" },
  { k:"嘆", m:"sigh / lament",on:"たん",    kun:"なげ",     level:5, jlpt:"N1" },
  { k:"凄", m:"amazing / eerie",on:"せい",  kun:"すご",     level:5, jlpt:"N1" },
  { k:"斬", m:"slash / behead",on:"ざん",   kun:"き",       level:5, jlpt:"N1" },
  { k:"卓", m:"table / eminent",on:"たく",  kun:"-",        level:5, jlpt:"N1" },
  { k:"騰", m:"rise / jump up",on:"とう",   kun:"-",        level:5, jlpt:"N1" },
  { k:"覇", m:"supremacy",    on:"は",      kun:"-",        level:5, jlpt:"N1" },
  { k:"摂", m:"intake / absorb",on:"せつ",  kun:"-",        level:5, jlpt:"N1" },
  { k:"懸", m:"hang / risk",  on:"けん",    kun:"か",       level:5, jlpt:"N1" },
  { k:"遡", m:"go upstream",  on:"そ",      kun:"さかのぼ", level:5, jlpt:"N1" },
  { k:"醸", m:"brew / ferment",on:"じょう", kun:"かも",     level:5, jlpt:"N1" },
  { k:"葛", m:"arrowroot / conflict",on:"かつ",kun:"くず",  level:5, jlpt:"N1" },
  { k:"藤", m:"wisteria",     on:"とう",    kun:"ふじ",     level:5, jlpt:"N1" },
  { k:"濫", m:"overflow / excessive",on:"らん",kun:"-",     level:5, jlpt:"N1" },
  { k:"禍", m:"disaster / evil",on:"か",    kun:"わざわ",   level:5, jlpt:"N1" },
  { k:"齎", m:"bring / cause",on:"せい",    kun:"もたら",   level:5, jlpt:"N1" },
  { k:"矜", m:"self-respect", on:"きん",    kun:"ほこ",     level:5, jlpt:"N1" },
];

// Get kanji pool filtered by ELO level
export function getPoolByElo(elo: number): Kanji[] {
  let maxLevel = 1;
  if (elo >= 1600) maxLevel = 5;      // Diamond+ → N1
  else if (elo >= 1200) maxLevel = 4; // Platinum+ → N2
  else if (elo >= 800) maxLevel = 3;  // Gold+ → N3
  else if (elo >= 400) maxLevel = 2;  // Silver+ → N4
  else maxLevel = 1;                  // Bronze → N5 only
  return KANJI_LIST.filter((k) => k.level <= maxLevel);
}

export function getPool(_category: string): Kanji[] {
  return KANJI_LIST;
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
    answers = kanji.m.split("/").map((s) => s.trim().toLowerCase());
    label = "Meaning";
  } else if (type === "onyomi") {
    if (kanji.on === "-") {
      // fallback to meaning if no on'yomi
      answers = kanji.m.split("/").map((s) => s.trim().toLowerCase());
      type = "meaning";
      label = "Meaning";
    } else {
      answers = [kanji.on.trim()];
      label = "On'yomi";
    }
  } else {
    if (kanji.kun === "-") {
      answers = kanji.m.split("/").map((s) => s.trim().toLowerCase());
      type = "meaning";
      label = "Meaning";
    } else {
      answers = [kanji.kun.trim()];
      label = "Kun'yomi";
    }
  }

  return { kanji, type, answers, label };
}

export function checkAnswer(input: string, answers: string[]): boolean {
  return answers.includes(input.trim().toLowerCase());
}
