export default {
  id: 'grammar',
  title: 'Where copy-paste breaks',
  zh: '語法',
  target: 'm',
  blurb:
    'Your Cantonese sentence structure carries over almost everywhere. These are the few places where the word order or the pattern changes.',
  units: [
    {
      title: 'Comparing: 過 becomes 比',
      explain:
        'Cantonese puts 過 after the adjective. Mandarin puts 比 and the other thing before it: A 比 B + adjective.',
      items: `
我比你高 | 我高過你 | I'm taller than you
今天比昨天熱 | 今日熱過尋日 | Today is hotter than yesterday
這個比那個貴 | 呢個貴過嗰個 | This one costs more than that one
`,
    },
    {
      title: 'Giving: the person comes first',
      explain: 'Cantonese says 畀 + thing + person. Mandarin says 給 + person + thing.',
      items: `
我給你錢 | 我畀錢你 | I'll give you money
給我一杯水 | 畀杯水我 | Give me a glass of water
他給了我一本書 | 佢畀咗本書我 | He gave me a book
`,
    },
    {
      title: '先 moves before the verb',
      explain: 'Cantonese puts 先 at the end of the sentence. Mandarin puts 先 before the verb.',
      items: `
你先走 | 你走先 | You go first
我先吃飯 | 我食飯先 | I'll eat first
等一下，我先問一下 | 等陣，我問下先 | Hold on, let me ask first
`,
    },
    {
      title: 'In progress: 緊 becomes 在',
      explain:
        'Cantonese marks an action in progress with 緊 after the verb. Mandarin puts 在 or 正在 before the verb.',
      items: `
我在吃飯 | 我食緊飯 | I'm eating
他正在開會 | 佢開緊會 | He's in a meeting right now
你在做什麼？ | 你做緊乜嘢？ | What are you doing?
`,
    },
    {
      title: 'Done: 咗 becomes 了',
      explain:
        '咗 becomes 了 in the same spot. "Yet" questions change shape: 咗…未？ becomes 了嗎？',
      items: `
我買了 | 我買咗 | I bought it
他走了 | 佢走咗 | He left
你到了嗎？ | 你到咗未？ | Have you arrived?
我還沒吃 | 我未食 | I haven't eaten yet
`,
    },
    {
      title: 'Yes or no questions',
      explain:
        '係咪 becomes 是不是, and verb-唔-verb becomes verb-不-verb. Mandarin can also just add 嗎 to a statement.',
      items: `
你是不是醫生？ | 你係咪醫生？ | Are you a doctor?
你會不會說普通話？ | 你識唔識講普通話？ | Can you speak Mandarin?
你去嗎？ | 你去唔去？ | Are you going?
你有沒有時間？ | 你有冇時間？ | Do you have time?
`,
    },
    {
      title: 'More and less',
      explain:
        'Cantonese puts 多啲 or 少啲 after the verb. Mandarin puts 多 or 少 before the verb and 一點 after it.',
      items: `
多吃一點 | 食多啲 | Eat a bit more
少喝一點酒 | 飲少啲酒 | Drink a little less
說慢一點 | 講慢啲 | Speak a bit slower
再吃一碗 | 食多碗添 | Have one more bowl
`,
    },
    {
      title: 'Possession and place',
      explain:
        '嘅 becomes 的 and 喺 becomes 在. The Cantonese classifier shortcut (我個仔, 本書) needs 的 or 這 in Mandarin.',
      items: `
這是我的朋友 | 呢個係我嘅朋友 | This is my friend
我在公司 | 我喺公司 | I'm at the office
你在哪裡？ | 你喺邊度？ | Where are you?
我的兒子很高 | 我個仔好高 | My son is tall
這本書很好看 | 本書好好睇 | This book is really good
`,
    },
    {
      title: 'All of it: 晒',
      explain:
        '晒 has no single Mandarin twin. Use 完 for "finished" and 都 for "all of them".',
      items: `
我吃完了 | 我食晒喇 | I finished all of it
他們都走了 | 佢哋走晒 | They've all left
太謝謝你了 | 多謝晒你 | Thank you so much
`,
    },
    {
      title: 'Let and by: 畀 splits in three',
      explain:
        '畀 does three jobs in Cantonese. Mandarin splits them: 給 to give, 讓 to let, 被 for something done to you.',
      items: `
讓我看一下 | 畀我睇下 | Let me take a look
讓我想一想 | 畀我諗下 | Let me think about it
他被老闆罵了 | 佢畀老細鬧咗 | He got told off by the boss
`,
    },
    {
      title: 'Also and all: 都',
      explain:
        'Cantonese 都 covers both "also" and "all". In Mandarin, "also" is 也 and only "all" stays 都.',
      items: `
我也是 | 我都係 | Me too
我也想去 | 我都想去 | I want to go too
我們都是廣東人 | 我哋都係廣東人 | We're all from Guangdong
`,
    },
    {
      title: 'Sentence endings',
      explain:
        'Mandarin has fewer final particles. 啦 becomes 吧 for suggestions, 咩 becomes 嗎 for questions, 喇 becomes 了 for a change, and 啫 becomes 而已.',
      items: `
走吧 | 走啦 | Let's go
是嗎？ | 係咩？ | Is that so?
下雨了 | 落雨喇 | It's started raining
我只是看看而已 | 我睇下啫 | I'm only looking
`,
    },
    {
      title: 'Only: 得 becomes 只有',
      explain: 'Cantonese 得 meaning "only have" becomes 只有 in Mandarin.',
      items: `
我只有一個 | 我得一個 | I only have one
只有我一個人 | 得我一個人 | It's just me
`,
    },
  ],
};
