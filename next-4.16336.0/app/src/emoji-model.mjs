// Emoji in the composer (2.2553.1 c099c328d-CbkcmYSW.js:4888-5030 'emoji-suggestion' + :5132-5230 Kd). Pure.
//  - ':' plus at least EMOJI_MIN_QUERY (Fd = 2) characters, at the start of the text or after whitespace and with
//    nothing but whitespace after the caret (Pd), opens a listbox of up to EMOJI_RESULT_LIMIT (Ed = 8) matches:
//    names that start with the query, then names that contain it, then keywords that start with it (Dd).
//  - Emoticons followed by a space turn into their emoji (Od / Ad input rule '(^|\s)(emoticon) $').
// Claude loads a full shortcode set lazily (So); this is a compact table of the common ones.
export const EMOJI_MIN_QUERY = 2;
export const EMOJI_RESULT_LIMIT = 8;
// Kd geometry: 280px wide, at most 280px tall, 24px from the caret line, 16px from the window edges.
export const EMOJI_POPUP = Object.freeze({ width: 280, maxHeight: 280, padding: 16, offset: 24 });

// Od, verbatim.
export const EMOTICONS = Object.freeze({
  "<3": "❤️", "</3": "\u{1F494}", ":)": "\u{1F642}", ":-)": "\u{1F642}", ":(": "\u{1F61E}", ":-(": "\u{1F61E}",
  ":'(": "\u{1F622}", ">:(": "\u{1F620}", ":D": "\u{1F603}", ":-D": "\u{1F603}", ":/": "\u{1F615}", ":-/": "\u{1F615}",
  ":\\": "\u{1F615}", ":-\\": "\u{1F615}", ":|": "\u{1F610}", ":-|": "\u{1F610}", ":*": "\u{1F618}", ":-*": "\u{1F618}",
  ":o": "\u{1F62E}", ":O": "\u{1F62E}", ":-o": "\u{1F62E}", ":-O": "\u{1F62E}", ":p": "\u{1F61B}", ":P": "\u{1F61B}",
  ":-p": "\u{1F61B}", ":-P": "\u{1F61B}", ";)": "\u{1F609}", ";-)": "\u{1F609}", ";p": "\u{1F61C}", ";P": "\u{1F61C}",
  ";-p": "\u{1F61C}", ";-P": "\u{1F61C}",
});
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const EMOTICON_RULE = new RegExp(`(^|\\s)(${Object.keys(EMOTICONS).sort((a, b) => b.length - a.length).map(escape).join("|")}) $`);

/** The emoticon replacement for the text before the caret once a space was typed (it ends with that space), or null. */
export function emoticonReplacement(before) {
  if (typeof before !== "string") return null;
  const match = EMOTICON_RULE.exec(before);
  if (!match) return null;
  const emoji = EMOTICONS[match[2]];
  if (!emoji) return null;
  const start = match.index + match[1].length;
  return { start, end: before.length, text: `${emoji} ` };
}

// char name keywords… (gemoji shortcodes).
const TABLE = `😀 grinning smile happy|😃 smiley happy joy|😄 smile happy joy laugh|😁 grin smile happy|😆 laughing happy haha
|😅 sweat_smile hot relief|🤣 rofl lol laughing|😂 joy tears laugh lol|🙂 slightly_smiling_face smile|🙃 upside_down_face silly
|😉 wink flirt|😊 blush smile proud|😇 innocent angel halo|🥰 smiling_face_with_three_hearts love crush|😍 heart_eyes love crush
|🤩 star_struck eyes wow|😘 kissing_heart flirt kiss|😋 yum tongue delicious|😛 stuck_out_tongue tongue|😜 stuck_out_tongue_winking_eye prank silly
|🤪 zany_face goofy wacky|😝 stuck_out_tongue_closed_eyes prank|🤑 money_mouth_face rich dollar|🤗 hugs hug|🤔 thinking hmm think
|🤐 zipper_mouth_face silence secret|🤨 raised_eyebrow suspicious|😐 neutral_face meh|😑 expressionless blank|😶 no_mouth mute silence
|😏 smirk smug|😒 unamused meh|🙄 roll_eyes eyeroll|😬 grimacing awkward|😌 relieved calm|😔 pensive sad|😪 sleepy tired|😴 sleeping zzz
|😷 mask sick ill|🤒 face_with_thermometer sick|🤕 face_with_head_bandage hurt|🤢 nauseated_face sick gross|🤮 vomiting_face sick
|🥵 hot_face heat sweating|🥶 cold_face freezing ice|🥴 woozy_face dizzy|😵 dizzy_face dizzy|🤯 exploding_head mind_blown shocked
|🤠 cowboy_hat_face cowboy|🥳 partying_face party celebration|😎 sunglasses cool|🤓 nerd_face geek glasses|🧐 monocle_face inspect
|😕 confused puzzled|😟 worried nervous|🙁 slightly_frowning_face sad|😮 open_mouth surprise wow|😯 hushed silence speechless
|😲 astonished amazed gasp|😳 flushed embarrassed|🥺 pleading_face puppy_eyes|😦 frowning surprise|😧 anguished stunned|😨 fearful scared
|😰 cold_sweat nervous|😥 disappointed_relieved phew|😢 cry sad tear|😭 sob sad cry|😱 scream horror shocked|😖 confounded
|😣 persevere struggling|😞 disappointed sad|😓 sweat tired|😩 weary tired|😫 tired_face upset|🥱 yawning_face bored tired
|😤 triumph smug|😡 rage angry|😠 angry mad annoyed|🤬 cursing_face swearing|😈 smiling_imp devil evil|💀 skull dead danger
|💩 hankey poop shit|🤡 clown_face clown|👻 ghost halloween|👽 alien ufo|🤖 robot bot|😺 smiley_cat cat|🙈 see_no_evil monkey blind
|🙉 hear_no_evil monkey deaf|🙊 speak_no_evil monkey mute|💋 kiss lips|💯 100 score perfect|💢 anger angry|💥 boom collision explode
|💫 dizzy star|💦 sweat_drops water|💨 dash wind fast|💬 speech_balloon comment chat|💭 thought_balloon thinking|💤 zzz sleeping
|👋 wave hello goodbye|🤚 raised_back_of_hand|✋ raised_hand hand highfive stop|👌 ok_hand ok perfect|🤌 pinched_fingers
|✌️ v victory peace|🤞 crossed_fingers luck hopeful|🤟 love_you_gesture|🤘 metal rock|👈 point_left left|👉 point_right right
|👆 point_up_2 up|👇 point_down down|☝️ point_up up|👍 +1 thumbsup approve ok yes|👎 -1 thumbsdown disapprove no
|✊ fist power|👊 facepunch punch attack|👏 clap applause praise|🙌 raised_hands hooray yeah|👐 open_hands|🤝 handshake deal
|🙏 pray please hope thanks|✍️ writing_hand|💪 muscle flex strong|🧠 brain smart|👀 eyes look see|👁️ eye|👶 baby child
|🧑‍💻 technologist coder developer|🤷 shrug idk whatever|🤦 facepalm|🙋 raising_hand|🙇 bow respect thanks|❤️ heart love
|🧡 orange_heart|💛 yellow_heart|💚 green_heart|💙 blue_heart|💜 purple_heart|🖤 black_heart|🤍 white_heart|💔 broken_heart
|💕 two_hearts love|💖 sparkling_heart love|✨ sparkles shiny new|⭐ star|🌟 star2 glow|⚡ zap lightning thunder fast|🔥 fire burn hot lit
|🌈 rainbow pride|☀️ sunny sun weather|⛅ partly_sunny weather cloud|☁️ cloud weather|🌧️ cloud_with_rain rain|❄️ snowflake winter cold
|🌊 ocean wave sea|💧 droplet water|🌍 earth_africa globe world|🌙 crescent_moon night|🌱 seedling plant grow|🌲 evergreen_tree tree
|🌸 cherry_blossom flower spring|🌹 rose flower|🌻 sunflower flower|🍀 four_leaf_clover luck|🍁 maple_leaf autumn|🐶 dog puppy pet
|🐱 cat kitten pet|🐭 mouse|🐰 rabbit bunny|🦊 fox_face fox|🐻 bear|🐼 panda_face panda|🐨 koala|🐯 tiger|🦁 lion|🐮 cow|🐷 pig
|🐸 frog|🐵 monkey_face monkey|🐔 chicken|🐧 penguin|🐦 bird|🦄 unicorn|🐝 bee honeybee|🐛 bug insect|🦋 butterfly|🐢 turtle slow
|🐍 snake python|🐙 octopus|🐳 whale|🐬 dolphin|🦀 crab rust|🍎 apple fruit|🍊 tangerine orange|🍋 lemon|🍌 banana|🍉 watermelon
|🍇 grapes|🍓 strawberry|🍑 peach|🍒 cherries|🥑 avocado|🍕 pizza|🍔 hamburger burger|🍟 fries|🌮 taco|🍣 sushi|🍜 ramen noodle
|🍩 doughnut donut|🍪 cookie|🎂 birthday cake|🍰 cake dessert|🍫 chocolate_bar|🍿 popcorn|☕ coffee cafe espresso|🍵 tea green_tea
|🍺 beer drink|🍻 beers cheers|🍷 wine_glass wine|🥂 clinking_glasses cheers|🎉 tada party hooray celebration|🎊 confetti_ball party
|🎈 balloon party|🎁 gift present birthday|🏆 trophy win award|🥇 1st_place_medal gold winner|🎯 dart target bullseye|🎮 video_game game
|🎲 game_die dice|🎵 musical_note music|🎶 notes music|🎨 art paint design|🎬 clapper film movie|📷 camera photo|💻 computer laptop
|🖥️ desktop_computer screen|⌨️ keyboard|🖱️ computer_mouse|📱 iphone phone mobile|☎️ phone telephone|🔋 battery power|🔌 electric_plug
|💡 bulb idea light|🔦 flashlight|📚 books library|📖 book open_book|📝 memo pencil note|✏️ pencil2 write|📌 pushpin pin|📎 paperclip
|📁 file_folder directory|📂 open_file_folder|📅 date calendar|📈 chart_with_upwards_trend graph growth|📉 chart_with_downwards_trend
|📊 bar_chart stats|📋 clipboard|📦 package box shipping|📮 postbox|✉️ email envelope letter mail|📧 e-mail email|🔍 mag search zoom
|🔒 lock security private|🔓 unlock security|🔑 key password lock|🔨 hammer tool|🛠️ hammer_and_wrench tools|🔧 wrench tool|⚙️ gear settings
|🧪 test_tube science test|🧰 toolbox|🧹 broom clean|🗑️ wastebasket trash delete|🚀 rocket ship launch|✈️ airplane flight travel
|🚗 car red_car|🚲 bike bicycle|🚧 construction wip|🚨 rotating_light alert siren|🏠 house home|🏢 office building|⏰ alarm_clock
|⌛ hourglass time|⏳ hourglass_flowing_sand time|⏱️ stopwatch|🕐 clock1 time|✅ white_check_mark check done yes|☑️ ballot_box_with_check
|✔️ heavy_check_mark check|❌ x cross no wrong|❎ negative_squared_cross_mark|➕ heavy_plus_sign plus|➖ heavy_minus_sign minus
|❓ question confused|❗ exclamation bang important|⚠️ warning caution|⛔ no_entry stop|🚫 no_entry_sign forbidden|♻️ recycle
|🆗 ok|🆕 new|🆙 up|🔴 red_circle|🟢 green_circle|🔵 large_blue_circle blue|⚪ white_circle|⚫ black_circle|🔺 small_red_triangle
|➡️ arrow_right|⬅️ arrow_left|⬆️ arrow_up|⬇️ arrow_down|🔄 arrows_counterclockwise sync refresh|🔁 repeat loop|🏁 checkered_flag finish
|🚩 triangular_flag_on_post flag|👑 crown king queen|💎 gem diamond|💰 moneybag money rich|💵 dollar money cash|💸 money_with_wings
|📣 mega announcement|🔔 bell notification|🔕 no_bell mute|🎤 microphone sing|🎧 headphones music|🧩 jigsaw puzzle|🪄 magic_wand magic
|🧭 compass direction|🗺️ world_map map|⛰️ mountain|🏖️ beach_umbrella beach|🌋 volcano|🗿 moyai stone|🐞 lady_beetle bug ladybug`;
export const EMOJI = Object.freeze(TABLE.split("|").map((row) => {
  const [char, name, ...keywords] = row.trim().split(/\s+/);
  return Object.freeze({ char, name, keywords: Object.freeze(keywords) });
}));

/** The ':query' token under the caret (Fd/Pd/allowSpaces false), or null. */
export function emojiToken(text, caret) {
  if (typeof text !== "string" || !Number.isInteger(caret) || caret < 0 || caret > text.length) return null;
  if (caret < text.length && !/\s/.test(text[caret])) return null;
  let start = caret;
  while (start > 0 && !/[\s:]/.test(text[start - 1])) start--;
  if (start === 0 || text[start - 1] !== ":") return null;
  const colon = start - 1;
  if (colon > 0 && !/\s/.test(text[colon - 1])) return null;
  const query = text.slice(start, caret);
  if (query.length < EMOJI_MIN_QUERY || !/^[\w+-]+$/.test(query)) return null;
  return { start: colon, end: caret, query };
}

/** Dd: up to `limit` emoji for a query (name prefix, then name substring, then keyword prefix). */
export function emojiMatches(query, limit = EMOJI_RESULT_LIMIT, table = EMOJI) {
  const needle = String(query ?? "").toLowerCase();
  if (!needle) return [];
  const prefix = [], contains = [], keyword = [];
  for (const entry of table) {
    if (entry.name.startsWith(needle)) prefix.push(entry);
    else if (entry.name.includes(needle)) contains.push(entry);
    else if (entry.keywords.some((word) => word.startsWith(needle))) keyword.push(entry);
    if (prefix.length >= limit) break;
  }
  return [...prefix, ...contains, ...keyword].slice(0, limit);
}

/** The token replaced by the picked emoji (Kd command: deleteRange + insertContent(char)), and the caret after it. */
export function insertEmoji(text, token, char) {
  const next = text.slice(0, token.start) + char + text.slice(token.end);
  return { text: next, caret: token.start + char.length };
}

/** Kd placement: below the caret line when there is more room there, else above; clamped inside the window. */
export function emojiPopupGeometry({ caret, viewport, popup = EMOJI_POPUP }) {
  const overflow = caret.left + popup.width + popup.padding - viewport.width;
  const left = overflow <= 0 ? caret.left : Math.max(popup.padding, caret.left - overflow);
  const above = caret.top - popup.offset - popup.padding, below = viewport.height - caret.top - popup.offset - popup.padding;
  const up = above >= below;
  return { left, top: up ? caret.top - popup.offset : caret.top + popup.offset, maxHeight: Math.min(popup.maxHeight, up ? above : below), up };
}
