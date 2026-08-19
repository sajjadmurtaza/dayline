import type { SupportedLocale } from "@/i18n/config";

export type SeoCopy = { title: string; description: string };
export type SeoFaq = { q: string; a: string };

export const INDEXABLE_RESTS = [
  "",
  "inbox",
  "calendar",
  "upcoming",
  "projects",
  "notes",
  "sometime",
  "brain-dump",
  "search",
  "more",
] as const;

export type IndexableRest = (typeof INDEXABLE_RESTS)[number];

export const HOME_COPY: Record<SupportedLocale, SeoCopy> = {
  en: {
    title: "Dayline | See today, place the work",
    description:
      "A visual daily operating system. See what to do, when it happens, how long it takes, what is happening now, and what comes next. Events stay fixed. Tasks find a home.",
  },
  ar: {
    title: "Dayline | انظر إلى اليوم وضع العمل في مكانه",
    description:
      "نظام يومي بصري. اعرف ماذا تفعل ومتى وكم يستغرق وماذا يحدث الآن وماذا بعد. الأحداث ثابتة. المهام تجد مكانًا.",
  },
  ur: {
    title: "Dayline | آج دیکھیں، کام کو جگہ دیں",
    description:
      "ایک بصری روزمرہ نظام۔ دیکھیں کیا کرنا ہے، کب ہوگا، کتنا وقت لگے گا، اب کیا ہو رہا ہے اور اگلا کیا ہے۔ ایونٹس فکس رہتے ہیں۔ ٹاسکس کو جگہ ملتی ہے۔",
  },
  ja: {
    title: "Dayline｜今日を見て、仕事を置く",
    description:
      "一日を視覚で見るOS。何をするか、いつか、どれくらいか、今なにか、次はなにか。予定は動かさない。タスクは場所を見つける。",
  },
  de: {
    title: "Dayline | Den Tag sehen, die Arbeit platzieren",
    description:
      "Ein visuelles Tages-Betriebssystem. Sehen, was zu tun ist, wann es passiert, wie lange es dauert, was jetzt läuft und was als Nächstes kommt. Termine bleiben fest. Aufgaben finden einen Platz.",
  },
  fr: {
    title: "Dayline | Voir le jour, placer le travail",
    description:
      "Un système d’exploitation visuel de la journée. Voir quoi faire, quand, combien de temps, ce qui se passe maintenant et ce qui vient. Les événements restent fixes. Les tâches trouvent une place.",
  },
  hi: {
    title: "Dayline | आज देखें, काम को जगह दें",
    description:
      "एक दृश्य दैनिक सिस्टम। देखें क्या करना है, कब होगा, कितना समय लगेगा, अभी क्या चल रहा है और आगे क्या है। इवेंट स्थिर रहते हैं। काम को जगह मिलती है।",
  },
  bn: {
    title: "Dayline | আজ দেখুন, কাজকে জায়গা দিন",
    description:
      "একটি দৃশ্যমান দৈনিক সিস্টেম। কী করতে হবে, কখন, কতক্ষণ, এখন কী চলছে এবং পরে কী—সব দেখুন। ইভেন্ট স্থির থাকে। কাজ জায়গা পায়।",
  },
  tr: {
    title: "Dayline | Günü görün, işe yer bulun",
    description:
      "Görsel bir günlük işletim sistemi. Ne yapılacağını, ne zaman olacağını, ne kadar süreceğini, şimdi ne olduğunu ve sıradakini görün. Etkinlikler sabit kalır. Görevler yer bulur.",
  },
  es: {
    title: "Dayline | Ver el día, colocar el trabajo",
    description:
      "Un sistema operativo visual del día. Ver qué hacer, cuándo ocurre, cuánto tarda, qué pasa ahora y qué sigue. Los eventos se quedan fijos. Las tareas encuentran un lugar.",
  },
  id: {
    title: "Dayline | Lihat hari ini, tempatkan pekerjaan",
    description:
      "Sistem operasi harian yang visual. Lihat apa yang harus dilakukan, kapan, berapa lama, apa yang terjadi sekarang, dan apa berikutnya. Acara tetap. Tugas mendapat tempat.",
  },
  ko: {
    title: "Dayline | 오늘을 보고, 일에 자리를 주세요",
    description:
      "하루를 눈으로 보는 운영 체제. 무엇을, 언제, 얼마나, 지금 무엇이며 다음은 무엇인지. 일정은 움직이지 않습니다. 할 일은 자리를 찾습니다.",
  },
  zh: {
    title: "Dayline | 看见今天，安放工作",
    description:
      "可视化的日常操作系统。看见要做什么、何时发生、需要多久、现在进行什么、接下来是什么。日程保持不动。任务找到位置。",
  },
  ru: {
    title: "Dayline | Увидеть день, найти место работе",
    description:
      "Визуальная операционная система дня. Что делать, когда, сколько займёт, что происходит сейчас и что дальше. События остаются на месте. Задачам находится дом.",
  },
};

const PAGE_EN: Record<Exclude<IndexableRest, "">, SeoCopy> = {
  inbox: {
    title: "Inbox | Dayline",
    description: "Unplaced work waiting for a time. Capture it, then put it on Today.",
  },
  calendar: {
    title: "Calendar | Dayline",
    description:
      "The week at the same zoom as Today: duration blocks, still-open work, and the day’s mood.",
  },
  upcoming: {
    title: "Upcoming | Dayline",
    description: "What is already scheduled after today. Fixed events stay where they are.",
  },
  projects: {
    title: "Projects | Dayline",
    description: "Named work with a next step, upcoming pieces, and notes nearby.",
  },
  notes: {
    title: "Notes | Dayline",
    description: "Ideas, reminders, questions, and pinned sticky notes for Today.",
  },
  sometime: {
    title: "Sometime | Dayline",
    description: "Someday / maybe. Not on the calendar until you place it.",
  },
  "brain-dump": {
    title: "Brain Dump | Dayline",
    description: "Write freely. Review suggestions before anything is saved.",
  },
  search: {
    title: "Search | Dayline",
    description: "Find tasks, events, notes, and projects in one place.",
  },
  more: {
    title: "More | Dayline",
    description: "Language, undo, and reset. Secondary screens live here on small devices.",
  },
};

export const PAGE_COPY: Record<Exclude<IndexableRest, "">, Record<SupportedLocale, SeoCopy>> = {
  inbox: {
    en: PAGE_EN.inbox,
    ar: { title: "الوارد | Dayline", description: "عمل بلا وقت. التقطه ثم ضعه على اليوم." },
    ur: { title: "ان باکس | Dayline", description: "بے جگہ کام۔ پکڑیں، پھر آج پر رکھیں۔" },
    ja: {
      title: "インボックス | Dayline",
      description: "まだ時間のない仕事。捕まえて、今日に置く。",
    },
    de: {
      title: "Posteingang | Dayline",
      description: "Arbeit ohne Uhrzeit. Erfassen, dann auf Heute legen.",
    },
    fr: {
      title: "Boîte | Dayline",
      description: "Travail sans horaire. Capturer, puis le poser sur Aujourd’hui.",
    },
    hi: { title: "इनबॉक्स | Dayline", description: "बिना समय का काम। पकड़ें, फिर आज पर रखें।" },
    bn: { title: "ইনবক্স | Dayline", description: "সময়হীন কাজ। ধরুন, তারপর আজকে রাখুন।" },
    tr: {
      title: "Gelen kutusu | Dayline",
      description: "Yeri olmayan iş. Yakala, sonra Bugün’e koy.",
    },
    es: {
      title: "Bandeja | Dayline",
      description: "Trabajo sin hora. Captúralo y colócalo en Hoy.",
    },
    id: {
      title: "Kotak masuk | Dayline",
      description: "Pekerjaan tanpa waktu. Tangkap, lalu taruh di Hari ini.",
    },
    ko: { title: "받은함 | Dayline", description: "아직 시간이 없는 일. 담은 뒤 오늘에 둡니다." },
    zh: { title: "收件箱 | Dayline", description: "还没有时间的工作。先记下，再放到今天。" },
    ru: {
      title: "Входящие | Dayline",
      description: "Работа без времени. Захватите и положите на Сегодня.",
    },
  },
  calendar: {
    en: PAGE_EN.calendar,
    ar: {
      title: "التقويم | Dayline",
      description: "الأسبوع بنفس مقياس اليوم: مدد، عمل مفتوح، ومزاج اليوم.",
    },
    ur: {
      title: "کیلنڈر | Dayline",
      description: "ہفتہ آج جیسا: مدت کے بلاک، کھلا کام، دن کا موڈ.",
    },
    ja: {
      title: "カレンダー | Dayline",
      description: "今日と同じ縮尺の週。所要時間、未完了、その日の気配。",
    },
    de: {
      title: "Kalender | Dayline",
      description: "Die Woche im gleichen Maßstab wie Heute: Dauer, offene Arbeit, Stimmung.",
    },
    fr: {
      title: "Calendrier | Dayline",
      description:
        "La semaine au même zoom qu’Aujourd’hui : durées, travail ouvert, humeur du jour.",
    },
    hi: {
      title: "कैलेंडर | Dayline",
      description: "आज जैसा सप्ताह: अवधि ब्लॉक, खुला काम, दिन का मूड।",
    },
    bn: {
      title: "ক্যালেন্ডার | Dayline",
      description: "আজকের মতো সপ্তাহ: সময়ের ব্লক, খোলা কাজ, দিনের মেজাজ।",
    },
    tr: {
      title: "Takvim | Dayline",
      description: "Bugün ile aynı ölçekte hafta: süreler, açık iş, günün hali.",
    },
    es: {
      title: "Calendario | Dayline",
      description:
        "La semana al mismo zoom que Hoy: duraciones, trabajo abierto y el ánimo del día.",
    },
    id: {
      title: "Kalender | Dayline",
      description:
        "Minggu dengan zoom yang sama seperti Hari ini: durasi, kerja terbuka, suasana hari.",
    },
    ko: {
      title: "달력 | Dayline",
      description: "오늘과 같은 배율의 한 주. 시간 블록, 아직 열린 일, 그날의 분위기.",
    },
    zh: {
      title: "日历 | Dayline",
      description: "与今天同一尺度的一周：时长块、未完成的事、那天的气氛。",
    },
    ru: {
      title: "Календарь | Dayline",
      description:
        "Неделя в том же масштабе, что Сегодня: длительности, открытая работа, настроение дня.",
    },
  },
  upcoming: {
    en: PAGE_EN.upcoming,
    ar: {
      title: "القادم | Dayline",
      description: "ما هو مجدول بعد اليوم. الأحداث الثابتة تبقى كما هي.",
    },
    ur: {
      title: "آنے والا | Dayline",
      description: "آج کے بعد جو شیڈول ہے۔ فکس ایونٹس اپنی جگہ رہتے ہیں۔",
    },
    ja: {
      title: "これから | Dayline",
      description: "今日より後に置いてあるもの。固定の予定は動かさない。",
    },
    de: {
      title: "Demnächst | Dayline",
      description: "Was nach heute schon festliegt. Termine bleiben wo sie sind.",
    },
    fr: {
      title: "À venir | Dayline",
      description: "Ce qui est déjà placé après aujourd’hui. Les événements restent.",
    },
    hi: { title: "आगे | Dayline", description: "आज के बाद जो तय है। इवेंट अपनी जगह रहते हैं।" },
    bn: { title: "আসন্ন | Dayline", description: "আজকের পর যা নির্ধারিত। ইভেন্ট জায়গায় থাকে।" },
    tr: {
      title: "Yaklaşan | Dayline",
      description: "Bugünden sonra planlananlar. Sabit etkinlikler yerinde kalır.",
    },
    es: {
      title: "Próximo | Dayline",
      description: "Lo que ya está colocado después de hoy. Los eventos se quedan.",
    },
    id: {
      title: "Mendatang | Dayline",
      description: "Yang sudah dijadwalkan setelah hari ini. Acara tetap di tempatnya.",
    },
    ko: {
      title: "예정 | Dayline",
      description: "오늘 이후에 이미 놓인 것. 고정 일정은 그대로입니다.",
    },
    zh: { title: "即将 | Dayline", description: "今天之后已经排好的事。固定日程保持不动。" },
    ru: {
      title: "Дальше | Dayline",
      description: "Что уже стоит после сегодня. События остаются на месте.",
    },
  },
  projects: {
    en: PAGE_EN.projects,
    ar: {
      title: "المشاريع | Dayline",
      description: "عمل مسمّى مع الخطوة التالية والملاحظات القريبة.",
    },
    ur: { title: "پروجیکٹس | Dayline", description: "نام والا کام، اگلا قدم، اور قریبی نوٹس۔" },
    ja: {
      title: "プロジェクト | Dayline",
      description: "名前のついた仕事。次の一歩とメモがそばにある。",
    },
    de: {
      title: "Projekte | Dayline",
      description: "Benannte Arbeit mit dem nächsten Schritt und Notizen in der Nähe.",
    },
    fr: {
      title: "Projets | Dayline",
      description: "Du travail nommé, avec la prochaine étape et des notes à côté.",
    },
    hi: { title: "प्रोजेक्ट | Dayline", description: "नाम वाला काम, अगला कदम, और पास में नोट्स।" },
    bn: { title: "প্রকল্প | Dayline", description: "নামসহ কাজ, পরের ধাপ, এবং কাছের নোট।" },
    tr: {
      title: "Projeler | Dayline",
      description: "Adı olan iş, sonraki adım ve yanındaki notlar.",
    },
    es: {
      title: "Proyectos | Dayline",
      description: "Trabajo con nombre, el siguiente paso y notas cerca.",
    },
    id: {
      title: "Proyek | Dayline",
      description: "Pekerjaan bernama, langkah berikutnya, dan catatan di dekatnya.",
    },
    ko: {
      title: "프로젝트 | Dayline",
      description: "이름 있는 일, 다음 한 걸음, 그리고 곁의 메모.",
    },
    zh: { title: "项目 | Dayline", description: "有名字的工作、下一步，以及旁边的笔记。" },
    ru: {
      title: "Проекты | Dayline",
      description: "Именованная работа, следующий шаг и заметки рядом.",
    },
  },
  notes: {
    en: PAGE_EN.notes,
    ar: {
      title: "الملاحظات | Dayline",
      description: "أفكار وتذكيرات وأسئلة وملاحظات مثبتة على اليوم.",
    },
    ur: {
      title: "نوٹس | Dayline",
      description: "خیالات، یاددہانی، سوالات، اور آج پر پن شدہ نوٹس۔",
    },
    ja: { title: "メモ | Dayline", description: "アイデア、覚え書き、問い、今日にピンした付箋。" },
    de: {
      title: "Notizen | Dayline",
      description: "Ideen, Merker, Fragen und auf Heute geheftete Notizen.",
    },
    fr: {
      title: "Notes | Dayline",
      description: "Idées, rappels, questions et notes épinglées sur Aujourd’hui.",
    },
    hi: { title: "नोट्स | Dayline", description: "विचार, याद, सवाल, और आज पर पिन किए नोट्स।" },
    bn: { title: "নোট | Dayline", description: "ভাবনা, মনে রাখা, প্রশ্ন, এবং আজকে পিন করা নোট।" },
    tr: {
      title: "Notlar | Dayline",
      description: "Fikirler, anımsatmalar, sorular ve Bugün’e iğnelenen notlar.",
    },
    es: {
      title: "Notas | Dayline",
      description: "Ideas, recordatorios, preguntas y notas fijadas en Hoy.",
    },
    id: {
      title: "Catatan | Dayline",
      description: "Ide, pengingat, pertanyaan, dan catatan yang disematkan di Hari ini.",
    },
    ko: { title: "메모 | Dayline", description: "생각, 기억, 질문, 그리고 오늘에 고정한 메모." },
    zh: { title: "笔记 | Dayline", description: "想法、备忘、问题，以及钉在今天上的便条。" },
    ru: {
      title: "Заметки | Dayline",
      description: "Идеи, напоминания, вопросы и заметки, закреплённые на Сегодня.",
    },
  },
  sometime: {
    en: PAGE_EN.sometime,
    ar: { title: "في وقت ما | Dayline", description: "يومًا ما. ليس على التقويم حتى تضعه." },
    ur: { title: "کبھی | Dayline", description: "کسی دن۔ کیلنڈر پر نہیں جب تک جگہ نہ دیں۔" },
    ja: { title: "いつか | Dayline", description: "いつか。置くまでカレンダーには出ない。" },
    de: {
      title: "Irgendwann | Dayline",
      description: "Irgendwann. Nicht im Kalender, bis du es platzierst.",
    },
    fr: {
      title: "Un jour | Dayline",
      description: "Un jour. Pas au calendrier tant que vous ne le placez pas.",
    },
    hi: { title: "कभी | Dayline", description: "कभी न कभी। रखे बिना कैलेंडर पर नहीं।" },
    bn: { title: "কখনো | Dayline", description: "কখনো একদিন। না রাখলে ক্যালেন্ডারে নয়।" },
    tr: { title: "Bir ara | Dayline", description: "Bir gün. Yerleştirene kadar takvimde değil." },
    es: {
      title: "Algún día | Dayline",
      description: "Algún día. No está en el calendario hasta que lo coloques.",
    },
    id: {
      title: "Suatu saat | Dayline",
      description: "Suatu hari. Tidak di kalender sampai Anda menempatkannya.",
    },
    ko: { title: "언젠가 | Dayline", description: "언젠가. 자리를 주기 전까지 달력에 없습니다." },
    zh: { title: "有朝一日 | Dayline", description: "有朝一日。在你安放之前，不出现在日历上。" },
    ru: {
      title: "Когда-нибудь | Dayline",
      description: "Когда-нибудь. Не в календаре, пока вы не положите.",
    },
  },
  "brain-dump": {
    en: PAGE_EN["brain-dump"],
    ar: {
      title: "تفريغ ذهني | Dayline",
      description: "اكتب بحرية. راجع الاقتراحات قبل أن يُحفظ شيء.",
    },
    ur: {
      title: "ذہنی ان لوڈ | Dayline",
      description: "آزاد لکھیں۔ کچھ محفوظ ہونے سے پہلے تجاویز دیکھیں۔",
    },
    ja: { title: "頭の中を出す | Dayline", description: "自由に書く。保存の前に提案を見る。" },
    de: {
      title: "Gedanken leeren | Dayline",
      description: "Frei schreiben. Vorschläge prüfen, bevor etwas gespeichert wird.",
    },
    fr: {
      title: "Vider la tête | Dayline",
      description: "Écrire librement. Relire les suggestions avant toute sauvegarde.",
    },
    hi: {
      title: "दिमाग उतारना | Dayline",
      description: "आज़ाद लिखें। सहेजने से पहले सुझाव देखें।",
    },
    bn: {
      title: "মস্তিষ্ক খালি | Dayline",
      description: "মুক্তভাবে লিখুন। কিছু সেভের আগে পরামর্শ দেখুন।",
    },
    tr: {
      title: "Kafayı boşalt | Dayline",
      description: "Serbest yaz. Bir şey kaydedilmeden önerileri incele.",
    },
    es: {
      title: "Vaciar la cabeza | Dayline",
      description: "Escribe libremente. Revisa las sugerencias antes de guardar.",
    },
    id: {
      title: "Tumpahkan pikiran | Dayline",
      description: "Tulis bebas. Tinjau usulan sebelum apa pun disimpan.",
    },
    ko: {
      title: "머리 비우기 | Dayline",
      description: "자유롭게 적으세요. 저장하기 전에 제안을 봅니다.",
    },
    zh: { title: "清空脑子 | Dayline", description: "随便写。保存之前先看建议。" },
    ru: {
      title: "Выгрузить голову | Dayline",
      description: "Пишите свободно. Смотрите предложения, прежде чем что-то сохранится.",
    },
  },
  search: {
    en: PAGE_EN.search,
    ar: {
      title: "بحث | Dayline",
      description: "ابحث في المهام والأحداث والملاحظات والمشاريع في مكان واحد.",
    },
    ur: { title: "تلاش | Dayline", description: "ٹاسک، ایونٹ، نوٹ اور پراجیکٹ ایک جگہ تلاش کریں۔" },
    ja: { title: "検索 | Dayline", description: "タスク、予定、メモ、プロジェクトを一箇所で。" },
    de: {
      title: "Suche | Dayline",
      description: "Aufgaben, Termine, Notizen und Projekte an einem Ort finden.",
    },
    fr: {
      title: "Recherche | Dayline",
      description: "Trouver tâches, événements, notes et projets au même endroit.",
    },
    hi: { title: "खोज | Dayline", description: "कार्य, इवेंट, नोट और प्रोजेक्ट एक जगह खोजें।" },
    bn: { title: "খোঁজ | Dayline", description: "কাজ, ইভেন্ট, নোট ও প্রকল্প এক জায়গায় খুঁজুন।" },
    tr: {
      title: "Ara | Dayline",
      description: "Görev, etkinlik, not ve projeleri tek yerde bulun.",
    },
    es: {
      title: "Buscar | Dayline",
      description: "Encuentra tareas, eventos, notas y proyectos en un solo lugar.",
    },
    id: {
      title: "Cari | Dayline",
      description: "Temukan tugas, acara, catatan, dan proyek di satu tempat.",
    },
    ko: {
      title: "검색 | Dayline",
      description: "할 일, 일정, 메모, 프로젝트를 한곳에서 찾습니다.",
    },
    zh: { title: "搜索 | Dayline", description: "在一处查找任务、日程、笔记和项目。" },
    ru: {
      title: "Поиск | Dayline",
      description: "Задачи, события, заметки и проекты — в одном месте.",
    },
  },
  more: {
    en: PAGE_EN.more,
    ar: {
      title: "المزيد | Dayline",
      description: "اللغة والتراجع وإعادة التعيين. الشاشات الثانوية هنا على الأجهزة الصغيرة.",
    },
    ur: {
      title: "مزید | Dayline",
      description: "زبان، انڈو، ری سیٹ۔ چھوٹی اسکرین پر ثانوی صفحات یہاں ہیں۔",
    },
    ja: {
      title: "その他 | Dayline",
      description: "言語、取り消し、リセット。小さい画面の二次画面はここ。",
    },
    de: {
      title: "Mehr | Dayline",
      description: "Sprache, Rückgängig, Zurücksetzen. Weitere Screens auf kleinen Geräten.",
    },
    fr: {
      title: "Plus | Dayline",
      description:
        "Langue, annuler, réinitialiser. Les écrans secondaires sont ici sur petit écran.",
    },
    hi: {
      title: "और | Dayline",
      description: "भाषा, पूर्ववत, रीसेट। छोटी स्क्रीन पर बाकी पन्ने यहाँ।",
    },
    bn: { title: "আরও | Dayline", description: "ভাষা, আনডু, রিসেট। ছোট স্ক্রিনে অন্য পাতা এখানে।" },
    tr: {
      title: "Daha fazla | Dayline",
      description: "Dil, geri al, sıfırla. Küçük ekranda diğer sayfalar burada.",
    },
    es: {
      title: "Más | Dayline",
      description: "Idioma, deshacer y reinicio. En pantallas pequeñas, el resto está aquí.",
    },
    id: {
      title: "Lainnya | Dayline",
      description: "Bahasa, urung, reset. Layar sekunder ada di sini di perangkat kecil.",
    },
    ko: {
      title: "더보기 | Dayline",
      description: "언어, 실행 취소, 초기화. 작은 화면의 나머지 화면은 여기.",
    },
    zh: { title: "更多 | Dayline", description: "语言、撤销、重置。小屏幕上的次要页面在这里。" },
    ru: {
      title: "Ещё | Dayline",
      description: "Язык, отмена, сброс. На маленьком экране остальные страницы здесь.",
    },
  },
};

export const NOT_FOUND_COPY: Record<SupportedLocale, SeoCopy> = {
  en: { title: "Not found | Dayline", description: "This page is not in Dayline." },
  ar: { title: "غير موجود | Dayline", description: "هذه الصفحة ليست في Dayline." },
  ur: { title: "نہیں ملا | Dayline", description: "یہ صفحہ Dayline میں نہیں ہے۔" },
  ja: { title: "見つかりません | Dayline", description: "このページは Dayline にありません。" },
  de: { title: "Nicht gefunden | Dayline", description: "Diese Seite gibt es in Dayline nicht." },
  fr: { title: "Introuvable | Dayline", description: "Cette page n’est pas dans Dayline." },
  hi: { title: "नहीं मिला | Dayline", description: "यह पेज Dayline में नहीं है।" },
  bn: { title: "পাওয়া যায়নি | Dayline", description: "এই পাতা Dayline-এ নেই।" },
  tr: { title: "Bulunamadı | Dayline", description: "Bu sayfa Dayline’da yok." },
  es: { title: "No encontrado | Dayline", description: "Esta página no está en Dayline." },
  id: { title: "Tidak ditemukan | Dayline", description: "Halaman ini tidak ada di Dayline." },
  ko: { title: "찾을 수 없음 | Dayline", description: "이 페이지는 Dayline에 없습니다." },
  zh: { title: "未找到 | Dayline", description: "Dayline 里没有这一页。" },
  ru: { title: "Не найдено | Dayline", description: "Этой страницы в Dayline нет." },
};

export const FAQS: Record<SupportedLocale, SeoFaq[]> = {
  en: [
    {
      q: "What is Dayline?",
      a: "A personal daily operating system. Open Today and see what to do, when it happens, how long it takes, what is happening now, and what is next.",
    },
    {
      q: "Does planning move my calendar events?",
      a: "No. Fixed events stay where they are. Planning only proposes places for flexible tasks. You accept.",
    },
    {
      q: "Where is my data?",
      a: "On this device, in the browser. There is no account. Reset demo data from More if you want a clean day.",
    },
  ],
  ar: [
    {
      q: "ما هو Dayline؟",
      a: "نظام يومي شخصي. افتح اليوم لترى ماذا تفعل ومتى وكم يستغرق وماذا يحدث الآن وماذا بعد.",
    },
    {
      q: "هل التخطيط ينقل أحداث التقويم؟",
      a: "لا. الأحداث الثابتة تبقى. التخطيط يقترح أماكن للمهام المرنة فقط. أنت توافق.",
    },
    {
      q: "أين بياناتي؟",
      a: "على هذا الجهاز في المتصفح. لا حساب. أعد بيانات التجربة من المزيد إن أردت يومًا نظيفًا.",
    },
  ],
  ur: [
    {
      q: "Dayline کیا ہے؟",
      a: "ذاتی روزمرہ نظام۔ آج کھولیں اور دیکھیں کیا کرنا ہے، کب، کتنا وقت، اب کیا ہو رہا ہے اور اگلا کیا ہے۔",
    },
    {
      q: "کیا پلاننگ میرے ایونٹس ہلاتی ہے؟",
      a: "نہیں۔ فکس ایونٹس رہتے ہیں۔ پلاننگ صرف لچکدار ٹاسکس کے لیے جگہ تجویز کرتی ہے۔ آپ قبول کرتے ہیں۔",
    },
    {
      q: "میرا ڈیٹا کہاں ہے؟",
      a: "اسی ڈیوائس کے براؤزر میں۔ کوئی اکاؤنٹ نہیں۔ مزید سے ڈیمو ری سیٹ کریں۔",
    },
  ],
  ja: [
    {
      q: "Dayline とは？",
      a: "個人の一日OS。今日を開けば、何をするか、いつか、どれくらいか、今なにか、次はなにかが見える。",
    },
    {
      q: "計画は予定を動かしますか？",
      a: "いいえ。固定の予定はそのまま。計画は柔軟なタスクの置き場を提案するだけ。あなたが受け入れる。",
    },
    {
      q: "データはどこ？",
      a: "この端末のブラウザ内。アカウントはない。きれいな日が欲しければ「その他」からデモをリセット。",
    },
  ],
  de: [
    {
      q: "Was ist Dayline?",
      a: "Ein persönliches Tages-Betriebssystem. Heute öffnen und sehen, was zu tun ist, wann, wie lange, was jetzt läuft und was als Nächstes kommt.",
    },
    {
      q: "Verschiebt die Planung meine Termine?",
      a: "Nein. Feste Termine bleiben. Die Planung schlägt nur Plätze für flexible Aufgaben vor. Du nimmst an.",
    },
    {
      q: "Wo sind meine Daten?",
      a: "Auf diesem Gerät im Browser. Kein Konto. Demo unter Mehr zurücksetzen, wenn du einen leeren Tag willst.",
    },
  ],
  fr: [
    {
      q: "Qu’est-ce que Dayline ?",
      a: "Un système d’exploitation personnel de la journée. Ouvrir Aujourd’hui pour voir quoi faire, quand, combien de temps, ce qui se passe maintenant et ce qui vient.",
    },
    {
      q: "Le planning déplace-t-il mes événements ?",
      a: "Non. Les événements fixes restent. Le planning propose seulement des places pour les tâches souples. Vous acceptez.",
    },
    {
      q: "Où sont mes données ?",
      a: "Sur cet appareil, dans le navigateur. Pas de compte. Réinitialiser la démo depuis Plus pour un jour propre.",
    },
  ],
  hi: [
    {
      q: "Dayline क्या है?",
      a: "व्यक्तिगत दैनिक सिस्टम। आज खोलें और देखें क्या करना है, कब, कितना समय, अभी क्या चल रहा है और आगे क्या है।",
    },
    {
      q: "क्या प्लानिंग इवेंट हिलाती है?",
      a: "नहीं। स्थिर इवेंट रहते हैं। प्लानिंग केवल लचीले काम के लिए जगह सुझाती है। आप स्वीकार करते हैं।",
    },
    {
      q: "डेटा कहाँ है?",
      a: "इस डिवाइस के ब्राउज़र में। कोई खाता नहीं। साफ़ दिन चाहिए तो और से डेमो रीसेट करें।",
    },
  ],
  bn: [
    {
      q: "Dayline কী?",
      a: "ব্যক্তিগত দৈনিক সিস্টেম। আজ খুলুন—কী করতে হবে, কখন, কতক্ষণ, এখন কী, পরে কী।",
    },
    {
      q: "প্ল্যানিং কি ইভেন্ট সরায়?",
      a: "না। স্থির ইভেন্ট থাকে। প্ল্যানিং শুধু নমনীয় কাজের জায়গা প্রস্তাব করে। আপনি মানেন।",
    },
    {
      q: "ডেটা কোথায়?",
      a: "এই ডিভাইসের ব্রাউজারে। অ্যাকাউন্ট নেই। পরিষ্কার দিন চাইলে আরও থেকে ডেমো রিসেট করুন।",
    },
  ],
  tr: [
    {
      q: "Dayline nedir?",
      a: "Kişisel bir günlük işletim sistemi. Bugün’ü açın: ne yapılacak, ne zaman, ne kadar sürecek, şimdi ne var, sırada ne var.",
    },
    {
      q: "Planlama etkinliklerimi taşır mı?",
      a: "Hayır. Sabit etkinlikler kalır. Planlama yalnızca esnek görevlere yer önerir. Siz kabul edersiniz.",
    },
    {
      q: "Verilerim nerede?",
      a: "Bu cihazın tarayıcısında. Hesap yok. Temiz bir gün için Daha fazla’dan demoyu sıfırlayın.",
    },
  ],
  es: [
    {
      q: "¿Qué es Dayline?",
      a: "Un sistema operativo personal del día. Abre Hoy y ve qué hacer, cuándo, cuánto tarda, qué pasa ahora y qué sigue.",
    },
    {
      q: "¿La planificación mueve mis eventos?",
      a: "No. Los eventos fijos se quedan. Solo propone sitios para tareas flexibles. Tú aceptas.",
    },
    {
      q: "¿Dónde están mis datos?",
      a: "En este dispositivo, en el navegador. Sin cuenta. Reinicia la demo desde Más si quieres un día limpio.",
    },
  ],
  id: [
    {
      q: "Apa itu Dayline?",
      a: "Sistem operasi harian pribadi. Buka Hari ini dan lihat apa yang harus dilakukan, kapan, berapa lama, apa yang terjadi sekarang, dan apa berikutnya.",
    },
    {
      q: "Apakah perencanaan memindahkan acara?",
      a: "Tidak. Acara tetap diam. Perencanaan hanya mengusulkan tempat untuk tugas fleksibel. Anda yang menerima.",
    },
    {
      q: "Data saya di mana?",
      a: "Di perangkat ini, di browser. Tidak ada akun. Reset demo dari Lainnya untuk hari yang bersih.",
    },
  ],
  ko: [
    {
      q: "Dayline은 무엇인가요?",
      a: "나만의 하루 운영 체제. 오늘을 열면 무엇을, 언제, 얼마나, 지금 무엇이며 다음은 무엇인지 보입니다.",
    },
    {
      q: "계획이 일정을 옮기나요?",
      a: "아니요. 고정 일정은 그대로입니다. 계획은 유연한 일의 자리만 제안합니다. 당신이 수락합니다.",
    },
    {
      q: "데이터는 어디에 있나요?",
      a: "이 기기의 브라우저에 있습니다. 계정은 없습니다. 깨끗한 날이 필요하면 더보기에서 데모를 초기화하세요.",
    },
  ],
  zh: [
    {
      q: "Dayline 是什么？",
      a: "个人的日常操作系统。打开今天，就能看见要做什么、何时、多久、现在进行什么、接下来是什么。",
    },
    {
      q: "规划会移动日程吗？",
      a: "不会。固定日程保持不动。规划只为弹性任务提议位置。由你接受。",
    },
    {
      q: "数据在哪里？",
      a: "在这台设备的浏览器里。没有账户。想要干净的一天，从更多里重置演示数据。",
    },
  ],
  ru: [
    {
      q: "Что такое Dayline?",
      a: "Личная операционная система дня. Откройте Сегодня и увидите, что делать, когда, сколько займёт, что происходит сейчас и что дальше.",
    },
    {
      q: "Планирование двигает события?",
      a: "Нет. Фиксированные события остаются. Планирование только предлагает места для гибких задач. Вы принимаете.",
    },
    {
      q: "Где мои данные?",
      a: "На этом устройстве, в браузере. Без аккаунта. Сбросьте демо в «Ещё», если нужен чистый день.",
    },
  ],
};
