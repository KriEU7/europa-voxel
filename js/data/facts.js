// ============================================================================
//  ALL THE GAME TEXTS ARE HERE – the team can edit this file without coding.
//
//  - Change the text between the quotes '...'.
//  - If a sentence contains an apostrophe use double quotes: "Disney's castle"
//  - After changing a text that is spoken, make its voice again:
//      npm run make-voices -- --only=<file name> --force
//
//  ⚠️ Every fact must be CHECKED on a reliable source before the presentation.
// ============================================================================

// Countries and their monuments (the guides' tours and tests are in GUIDES below).
export const COUNTRIES = {
  belgium: { name: 'Belgium', monuments: [{ id: 'atomium', name: 'Atomium' }] },
  italy: { name: 'Italy', monuments: [{ id: 'colosseum', name: 'Colosseum' }, { id: 'pisa', name: 'Leaning Tower of Pisa' }] },
  france: { name: 'France', monuments: [{ id: 'eiffel', name: 'Eiffel Tower' }] },
  germany: { name: 'Germany', monuments: [{ id: 'brandenburg', name: 'Brandenburg Gate' }, { id: 'neuschwanstein', name: 'Neuschwanstein Castle' }] },
  spain: { name: 'Spain', monuments: [{ id: 'sagrada', name: 'Sagrada Família' }] },
  netherlands: { name: 'The Netherlands', monuments: [{ id: 'windmills', name: 'Windmills' }] },
  greece: { name: 'Greece', monuments: [{ id: 'parthenon', name: 'Parthenon' }] },
  uk: { name: 'United Kingdom', monuments: [{ id: 'bigben', name: 'Big Ben' }] },
};

// ============================================================================
//  CREW – the pilot at the airport and the captain at the pier of each island.
//  Talk to them (E) to choose where to travel.
// ============================================================================

export const CREW = {
  france: { pilot: 'Pilot Amélie', captain: 'Captain Yves' },
  belgium: { pilot: 'Pilot Jonas', captain: 'Captain Wout' },
  netherlands: { pilot: 'Pilot Femke', captain: 'Captain Joost' },
  uk: { pilot: 'Pilot Oliver', captain: 'Captain Harry' },
  germany: { pilot: 'Pilot Lukas', captain: 'Captain Klaus' },
  spain: { pilot: 'Pilot Carmen', captain: 'Captain Diego' },
  italy: { pilot: 'Pilot Matteo', captain: 'Captain Paolo' },
  greece: { pilot: 'Pilot Dimitris', captain: 'Captain Kostas' },
};

// ============================================================================
//  PEOPLE YOU MEET – 4 per island. Press E near them to hear what they say.
//  Change `name` and `says`; gender ('m' or 'f') chooses the voice. Clothes are in js/npc.js.
// ============================================================================

export const PEOPLE = {
  france: [
    { name: 'Pierre the baker', gender: 'm', says: 'Bonjour! Would you like a baguette? French people buy billions of baguettes every year!' },
    { name: 'Claude the painter', gender: 'm', says: 'Salut! Many famous painters, like Monet, lived and worked in France.' },
    { name: 'Emma, a tourist', gender: 'f', says: 'Hi! I climbed the Eiffel Tower: it has 674 steps to the second floor!' },
    { name: 'Camille', gender: 'f', says: 'Bonjour! In France we eat cheese after dinner. There are more than 1,000 kinds!' },
  ],
  belgium: [
    { name: 'Lucas the chocolatier', gender: 'm', says: 'Hallo! Belgium makes some of the best chocolate in the world. Try a praline!' },
    { name: 'Noah, a student', gender: 'm', says: 'Hi! Many students in Europe travel with the Erasmus programme. I study in Brussels!' },
    { name: 'Louis', gender: 'm', says: 'Bonjour! Did you know that the comic Tintin was created in Belgium?' },
    { name: 'Marie', gender: 'f', says: 'Welcome to Brussels, the capital of Europe!' },
  ],
  netherlands: [
    { name: 'Daan', gender: 'm', says: 'Hallo! Orange is our national colour, because of the royal family, the House of Orange.' },
    { name: 'Farmer Jan', gender: 'm', says: 'Goedendag! In spring our tulip fields look like a rainbow.' },
    { name: 'Sanne', gender: 'f', says: 'Hoi! I go to school by bike every day, even when it rains!' },
    { name: 'Bram', gender: 'm', says: 'Hi! Amsterdam has more than 100 kilometres of canals.' },
  ],
  uk: [
    // silent: he doesn't talk and you can't ask him anything (only say goodbye)
    { name: 'The Royal Guard', gender: 'm', silent: true, says: 'Royal Guards are not allowed to talk while they are on duty!' },
    { name: 'Mr Smith', gender: 'm', says: 'Hello! Fancy a cup of tea? British people drink about 100 million cups a day!' },
    { name: 'Olivia', gender: 'f', says: 'Hi there! London has a famous red double-decker bus.' },
    { name: 'Jack, a tourist', gender: 'm', says: 'Hello, mate! In the UK we drive on the left side of the road.' },
  ],
  germany: [
    { name: 'Hans the hiker', gender: 'm', says: 'Hallo! Germany has many forests. The Black Forest is the most famous one.' },
    { name: 'Greta the baker', gender: 'f', says: 'Guten Tag! Have you tried a pretzel? We call it Brezel.' },
    { name: 'Lena', gender: 'f', says: 'Hallo! Many cars, like Volkswagen and BMW, come from Germany.' },
    { name: 'Felix', gender: 'm', says: 'Hi! Berlin is the capital of Germany and it is full of history.' },
  ],
  spain: [
    { name: 'Lucía the dancer', gender: 'f', says: '¡Hola! Flamenco is a traditional dance from the south of Spain.' },
    { name: 'Chef Javier', gender: 'm', says: '¡Hola! Paella is a rice dish from Valencia. Delicious!' },
    { name: 'Pablo', gender: 'm', says: '¡Hola! In Spain many people have dinner very late, at 9 or 10 pm!' },
    { name: 'Sofia, a tourist', gender: 'f', says: 'Hi! Spanish is spoken by more than 500 million people in the world.' },
  ],
  italy: [
    { name: 'Marco the gondolier', gender: 'm', says: 'Ciao! In Venice people move by boat, on the canals.' },
    { name: 'Chef Giuseppe', gender: 'm', says: 'Buongiorno! Pizza was born in Naples. Mamma mia!' },
    { name: 'Giulia', gender: 'f', says: 'Ciao! Italy has more than 50 UNESCO World Heritage Sites.' },
    { name: 'Luca', gender: 'm', says: 'Ciao! Football is very popular in Italy. Forza Azzurri!' },
  ],
  greece: [
    { name: 'Nikos the fisherman', gender: 'm', says: 'Yia sou! Greek people have fished in these blue seas for thousands of years.' },
    { name: 'Eleni', gender: 'f', says: 'Yia sou! The word "Europe" comes from Europa, a princess in Greek mythology.' },
    { name: 'Yannis', gender: 'm', says: 'Hello! Greece produces a lot of olive oil. Olive trees can live for centuries!' },
    { name: 'Anna, a tourist', gender: 'f', says: 'Hi! The white houses with blue doors on Santorini are so beautiful!' },
  ],
};

// ============================================================================
//  CITY TOURS – a guide stands next to every monument. Press E: she shows
//  you her whole city (one line = one "slide", read aloud in English),
//  then there is a test of 5 questions. 3 right answers = the country's stamp!
//  In the test, write the options in any order: the game mixes them.
//
//  Voices: recordings in public/voices/ (see "npm run voices"), otherwise
//  the computer's English voice.
// ============================================================================

export const GUIDES = {
  eiffel: {
    guide: 'Guide Sophie',
    city: 'Paris',
    slides: [
      "Bonjour and welcome to Paris, the capital of France! I'm Sophie, and today I'll show you my city.",
      'Paris is cut in two by the river Seine. There are 37 bridges across it, and the oldest one is called Pont Neuf, which means New Bridge!',
      'This is the Eiffel Tower. It was built for the World\'s Fair of 1889 and it is about 330 metres tall. At first, many artists hated it!',
      'Paris also has the Louvre, the biggest art museum in the world. Its most famous painting is the Mona Lisa, by Leonardo da Vinci.',
      'On an island in the middle of the Seine there is Notre-Dame, a cathedral more than 800 years old. It was damaged by a fire in 2019 and opened again in 2024.',
      'Parisians love cafés and bakeries: every neighbourhood has a boulangerie with fresh baguettes and croissants.',
      'Paris is often called the City of Light. Now let\'s see what you remember: time for a little test!',
    ],
    test: [
      { q: 'Which river flows through Paris?', options: ['The Seine', 'The Thames', 'The Danube'], answer: 0 },
      { q: 'What is the most famous painting in the Louvre?', options: ['The Mona Lisa', 'The Sunflowers', 'The Scream'], answer: 0 },
      { q: 'Why was the Eiffel Tower built?', options: ["For the World's Fair of 1889", 'As a church', 'As a home for the king'], answer: 0 },
      { q: 'What does Pont Neuf mean?', options: ['New Bridge', 'Old Bridge', 'Long Bridge'], answer: 0 },
      { q: 'What is Paris often called?', options: ['The City of Light', 'The Eternal City', 'The Big Apple'], answer: 0 },
    ],
  },
  atomium: {
    guide: 'Guide Lotte',
    city: 'Brussels',
    slides: [
      "Hello and welcome to Brussels, the capital of Belgium! I'm Lotte.",
      'Brussels is also called the capital of Europe, because important European institutions, like the European Commission, are here.',
      'This is the Atomium. It was built for Expo 58, the World\'s Fair of 1958, and it shows an iron crystal made 165 billion times bigger.',
      'In the old centre there is the Grand-Place, one of the most beautiful squares in the world. Every two years it is covered with a carpet of flowers!',
      'Near the square you can meet the Manneken Pis, a tiny statue of a boy doing a wee. He has more than a thousand costumes!',
      'Brussels is famous for chocolate, waffles and comics: there are big comic strip paintings on the walls of many buildings.',
      "Now let's check if you were listening. Here comes your test!",
    ],
    test: [
      { q: 'Why is Brussels called the capital of Europe?', options: ['Important EU institutions are here', 'It is the biggest city in Europe', 'It is in the centre of Europe'], answer: 0 },
      { q: 'For which event was the Atomium built?', options: ['Expo 58', 'The Olympic Games', 'A football World Cup'], answer: 0 },
      { q: 'What covers the Grand-Place every two years?', options: ['A carpet of flowers', 'Snow', 'Chocolate'], answer: 0 },
      { q: 'How many costumes does the Manneken Pis have?', options: ['More than a thousand', 'About ten', 'None'], answer: 0 },
      { q: 'What can you see painted on many walls in Brussels?', options: ['Comic strips', 'Maps', 'Football players'], answer: 0 },
    ],
  },
  windmills: {
    guide: 'Guide Anouk',
    city: 'Amsterdam',
    slides: [
      "Hoi! I'm Anouk. Welcome to the Netherlands! Let me tell you about Amsterdam, our capital.",
      'Amsterdam has more than 100 kilometres of canals and about 1,500 bridges. Its ring of canals is a UNESCO World Heritage Site.',
      'The city is built on millions of wooden poles pushed into the wet ground. The Royal Palace alone stands on almost 14,000 of them!',
      'In Amsterdam you can visit the house where Anne Frank hid during the Second World War, and the Van Gogh Museum.',
      'Here you see our windmills. A lot of the country is below sea level, and for centuries windmills pumped the water away to keep the land dry.',
      'There are more bicycles than people in the Netherlands, and in spring the tulip fields look like a rainbow.',
      "Okay, test time! Let's see how much you remember.",
    ],
    test: [
      { q: 'How many bridges does Amsterdam have?', options: ['About 1,500', 'About 15', 'About 150,000'], answer: 0 },
      { q: 'What is Amsterdam built on?', options: ['Wooden poles', 'Rocks', 'Ice'], answer: 0 },
      { q: 'Whose house can you visit in Amsterdam?', options: ["Anne Frank's", "Mozart's", "Shakespeare's"], answer: 0 },
      { q: 'What did the windmills do?', options: ['They pumped the water away', 'They made the land warmer', 'They painted the houses'], answer: 0 },
      { q: 'What do the tulip fields look like in spring?', options: ['A rainbow', 'A desert', 'A forest'], answer: 0 },
    ],
  },
  bigben: {
    guide: 'Guide Charlotte',
    city: 'London',
    slides: [
      "Hello and welcome to London, the capital of the United Kingdom! I'm Charlotte.",
      'London is about two thousand years old: the Romans founded it and called it Londinium.',
      'This is the clock tower of the Houses of Parliament. Everybody calls it Big Ben, but Big Ben is really the name of the great bell inside!',
      'The King lives in Buckingham Palace, where you can watch the Changing of the Guard. The soldiers wear red jackets and tall black bearskin hats.',
      'London has the oldest underground railway in the world, called the Tube. It opened in 1863!',
      'Along the river Thames you can see Tower Bridge and the London Eye, a giant wheel 135 metres tall.',
      'Now, a cup of tea and a little test! Good luck!',
    ],
    test: [
      { q: 'What did the Romans call London?', options: ['Londinium', 'Londra', 'Lutetia'], answer: 0 },
      { q: 'What is Big Ben?', options: ['The great bell', 'The tower', "The King's horse"], answer: 0 },
      { q: 'Where does the King live?', options: ['Buckingham Palace', 'Tower Bridge', 'The London Eye'], answer: 0 },
      { q: 'What is the London Underground called?', options: ['The Tube', 'The Metro', 'The Subway'], answer: 0 },
      { q: 'Which river flows through London?', options: ['The Thames', 'The Seine', 'The Tiber'], answer: 0 },
    ],
  },
  brandenburg: {
    guide: 'Guide Jana',
    city: 'Berlin',
    slides: [
      "Hallo! I'm Jana. Welcome to Berlin, the capital of Germany!",
      'This is the Brandenburg Gate, finished in 1791. On top there is the Quadriga, a chariot pulled by four horses.',
      'From 1961 to 1989 the Berlin Wall divided the city into East and West. Families and friends could not see each other.',
      'The Wall fell on the 9th of November 1989. Today you can still see a long piece of it, the East Side Gallery, covered with paintings.',
      'The Reichstag, the German parliament, has a big glass dome on top. Visitors can walk up inside it and look down at the politicians!',
      'Berliners love currywurst, a sausage with curry ketchup. And Berlin has more bridges than Venice!',
      "Ready? Let's do the test!",
    ],
    test: [
      { q: 'What is on top of the Brandenburg Gate?', options: ['The Quadriga', 'A clock', 'A big bell'], answer: 0 },
      { q: 'When did the Berlin Wall fall?', options: ['1989', '1961', '2001'], answer: 0 },
      { q: 'What is the East Side Gallery?', options: ['A piece of the Wall with paintings', 'A shopping centre', 'A car museum'], answer: 0 },
      { q: 'What is on top of the Reichstag?', options: ['A glass dome', 'A golden statue', 'A garden'], answer: 0 },
      { q: 'What is a currywurst?', options: ['A sausage with curry ketchup', 'A cake', 'A soup'], answer: 0 },
    ],
  },
  neuschwanstein: {
    guide: 'Guide Jana',
    city: 'Bavaria',
    slides: [
      'Now we are in Bavaria, in the south of Germany, near the Alps.',
      'This is Neuschwanstein Castle. King Ludwig the Second started building it in 1869. People called him the Fairy Tale King.',
      "The castle inspired Walt Disney's Sleeping Beauty Castle, and more than a million people visit it every year.",
      'The capital of Bavaria is Munich. Its town hall has a famous clock, the Glockenspiel, with little dancing figures.',
      'Munich is famous for the Oktoberfest, the biggest folk festival in the world. Funny fact: it starts in September!',
      'For festivals many Bavarians wear traditional clothes: leather trousers called Lederhosen, and dresses called Dirndl.',
      "Time for the test! Five questions, let's go!",
    ],
    test: [
      { q: 'Who built Neuschwanstein Castle?', options: ['King Ludwig the Second', 'Napoleon', 'Walt Disney'], answer: 0 },
      { q: 'Which famous castle did Neuschwanstein inspire?', options: ['Sleeping Beauty Castle', 'Hogwarts', 'Windsor Castle'], answer: 0 },
      { q: 'What is the capital of Bavaria?', options: ['Munich', 'Berlin', 'Vienna'], answer: 0 },
      { q: 'When does the Oktoberfest start?', options: ['In September', 'In December', 'In May'], answer: 0 },
      { q: 'What are Lederhosen?', options: ['Leather trousers', 'Sausages', 'Mountains'], answer: 0 },
    ],
  },
  sagrada: {
    guide: 'Guide Marta',
    city: 'Barcelona',
    slides: [
      "¡Hola! I'm Marta. Welcome to Barcelona, a city between the mountains and the Mediterranean Sea!",
      'This is the Sagrada Família, designed by Antoni Gaudí. Building started in 1882, and it is still not finished!',
      'Gaudí designed many other buildings here, like Park Güell, with its colourful mosaic lizard, and Casa Batlló, which looks like a dragon.',
      'The most famous street is La Rambla, full of people, flowers and street artists.',
      'In Barcelona people speak two languages: Spanish and Catalan.',
      'Barcelona has beaches in the city and a famous football team, FC Barcelona. Its stadium, Camp Nou, is the biggest in Europe!',
      "¡Vamos! Let's see what you remember with a quick test.",
    ],
    test: [
      { q: 'Who designed the Sagrada Família?', options: ['Antoni Gaudí', 'Pablo Picasso', 'Salvador Dalí'], answer: 0 },
      { q: 'Which animal is the famous mosaic in Park Güell?', options: ['A lizard', 'A cat', 'A fish'], answer: 0 },
      { q: 'Which two languages are spoken in Barcelona?', options: ['Spanish and Catalan', 'Spanish and French', 'Italian and Catalan'], answer: 0 },
      { q: 'What is La Rambla?', options: ['A famous street', 'A cake', 'A mountain'], answer: 0 },
      { q: "What is the name of Barcelona's football stadium?", options: ['Camp Nou', 'Wembley', 'San Siro'], answer: 0 },
    ],
  },
  colosseum: {
    guide: 'Guide Francesca',
    city: 'Rome',
    slides: [
      "Ciao! I'm Francesca. Welcome to Rome, the capital of Italy, also called the Eternal City!",
      'The legend says that Rome was founded in 753 BC by Romulus, who grew up with his brother Remus thanks to a she-wolf.',
      'This is the Colosseum. It opened in the year 80, and up to fifty thousand people came here to watch gladiators fight.',
      'Inside Rome there is a whole other country: Vatican City, the smallest country in the world, where the Pope lives.',
      'If you throw a coin into the Trevi Fountain, the legend says you will come back to Rome. People throw in more than a million euros every year!',
      'And of course, Rome is the place for pizza, pasta carbonara and gelato!',
      'Now, a little test. In bocca al lupo: good luck!',
    ],
    test: [
      { q: 'What is Rome also called?', options: ['The Eternal City', 'The City of Light', 'The Big Smoke'], answer: 0 },
      { q: 'Who helped Romulus and Remus when they were babies?', options: ['A she-wolf', 'A bear', 'An eagle'], answer: 0 },
      { q: 'What is the smallest country in the world?', options: ['Vatican City', 'Monaco', 'San Marino'], answer: 0 },
      { q: 'What happens if you throw a coin into the Trevi Fountain?', options: ['You will come back to Rome', 'You will become rich', 'It will rain'], answer: 0 },
      { q: 'When did the Colosseum open?', options: ['In the year 80', 'In 1492', 'In 1900'], answer: 0 },
    ],
  },
  pisa: {
    guide: 'Guide Francesca',
    city: 'Pisa',
    slides: [
      'And now we are in Pisa, a city in Tuscany!',
      'The Leaning Tower is the bell tower of the cathedral. It stands in the Square of Miracles, together with the cathedral and the baptistery.',
      'Building started in 1173. After only three floors it began to lean, because the ground under it is too soft.',
      'The famous scientist Galileo Galilei was born in Pisa in 1564. A legend says he dropped balls from the tower to study how things fall!',
      'Pisa has one of the oldest universities in Italy, so the city is full of students.',
      'Engineers made the tower safer between 1990 and 2001. It still leans by about four degrees!',
      "Let's see if you were listening: here is your test!",
    ],
    test: [
      { q: 'What is the Leaning Tower?', options: ['A bell tower', 'A lighthouse', 'A castle'], answer: 0 },
      { q: 'Why does the tower lean?', options: ['The ground is too soft', 'It was built like that', 'A storm pushed it'], answer: 0 },
      { q: 'Which famous scientist was born in Pisa?', options: ['Galileo Galilei', 'Isaac Newton', 'Albert Einstein'], answer: 0 },
      { q: 'What is the square of the tower called?', options: ['The Square of Miracles', 'The Square of Kings', 'The Square of Flowers'], answer: 0 },
      { q: 'How much does the tower lean today?', options: ['About 4 degrees', 'About 45 degrees', 'It does not lean any more'], answer: 0 },
    ],
  },
  parthenon: {
    guide: 'Guide Katerina',
    city: 'Athens',
    slides: [
      "Yia sou! I'm Katerina. Welcome to Athens, the capital of Greece and one of the oldest cities in the world!",
      'Athens is named after Athena, the goddess of wisdom. The legend says she won a contest against Poseidon by giving the city an olive tree.',
      'This is the Parthenon, a temple for Athena on the Acropolis hill. It was built about 2,500 years ago.',
      'Democracy was born here! In ancient Athens, the citizens voted on the laws together.',
      'The first modern Olympic Games were held in Athens in 1896, in the Panathenaic Stadium, made of marble.',
      'In the Plaka, the old neighbourhood, you can eat souvlaki and Greek salad under the Acropolis.',
      "Now let's play: five questions for you. Good luck!",
    ],
    test: [
      { q: 'Who is Athens named after?', options: ['Athena', 'Zeus', 'Apollo'], answer: 0 },
      { q: 'What did Athena give to the city?', options: ['An olive tree', 'A horse', 'A golden sword'], answer: 0 },
      { q: 'What was born in ancient Athens?', options: ['Democracy', 'Football', 'Pizza'], answer: 0 },
      { q: 'When were the first modern Olympic Games held in Athens?', options: ['1896', '1966', '2004'], answer: 0 },
      { q: 'Where is the Parthenon?', options: ['On the Acropolis', 'Under the sea', 'In Rome'], answer: 0 },
    ],
  },
};

// ============================================================================
//  QUESTIONS YOU CAN ASK THE PEOPLE – the same questions for everybody on an
//  island, with nice (and silly) answers about their country.
// ============================================================================

export const QUESTIONS = {
  france: [
    { q: 'What do people eat here?', a: 'Baguettes, cheese, croissants... and snails! Yes, escargots are a real French dish.' },
    { q: 'Tell me something funny!', a: "In France, April Fools' Day is called Poisson d'avril, April fish! Children stick paper fish on people's backs." },
    { q: 'How do I say hello and thank you?', a: 'Hello is Bonjour and thank you is Merci. When we meet friends, we often kiss them on both cheeks: la bise!' },
    { q: 'What do people do for fun?', a: 'We watch the Tour de France, a bike race of about 3,500 kilometres in three weeks. My legs hurt just thinking about it!' },
    { q: 'Any tips for a tourist?', a: "Always say Bonjour when you walk into a shop. If you don't, people might think you are rude!" },
  ],
  belgium: [
    { q: 'What do people eat here?', a: 'Fries! We say Belgians invented them, not the French. And we eat them with mayonnaise.' },
    { q: 'Tell me something funny!', a: 'The Manneken Pis is a tiny statue of a boy doing a wee. He has more than a thousand costumes!' },
    { q: 'How do I say hello and thank you?', a: 'We have three languages! In Dutch: Hallo and Dank u. In French: Bonjour and Merci. In German: Hallo and Danke.' },
    { q: 'What do people do for fun?', a: 'We read comics! The Smurfs and Tintin were both born in Belgium.' },
    { q: 'Any tips for a tourist?', a: 'Try a real Belgian waffle. But be careful: in Brussels and in Liège they are different, and everybody says theirs is the best!' },
  ],
  netherlands: [
    { q: 'What do people eat here?', a: 'Stroopwafels: two thin waffles with syrup in the middle. Put one on top of your hot drink to make it soft!' },
    { q: 'Tell me something funny!', a: 'Dutch people are among the tallest people in the world. I have to duck under doors!' },
    { q: 'How do I say hello and thank you?', a: 'Hallo and Dank je wel. Easy, right?' },
    { q: 'What do people do for fun?', a: "On King's Day, the 27th of April, everybody wears orange and the streets become one giant party and market!" },
    { q: 'Any tips for a tourist?', a: 'Watch out for bikes! Bike lanes are everywhere and cyclists will not stop for you.' },
  ],
  uk: [
    { q: 'What do people eat here?', a: 'Fish and chips! And a full English breakfast: eggs, bacon, sausages, beans, mushrooms and toast.' },
    { q: 'Tell me something funny!', a: 'The King has two birthdays: his real one and an official one in summer, with a big parade!' },
    { q: 'How do I say hello and thank you?', a: 'Hello and thank you, of course! But you can also say Cheers to say thank you.' },
    { q: 'What do people do for fun?', a: 'Football! The modern rules of football were written in England in 1863. And we love talking about the weather.' },
    { q: 'Any tips for a tourist?', a: 'On the escalators in London, always stand on the right, so people in a hurry can walk on the left!' },
  ],
  germany: [
    { q: 'What do people eat here?', a: 'Bread! Germany has more than three thousand kinds of bread. And of course pretzels and sausages.' },
    { q: 'Tell me something funny!', a: 'Some German words are super long! Donaudampfschifffahrtsgesellschaft means Danube steamship company.' },
    { q: 'How do I say hello and thank you?', a: 'Hallo or Guten Tag, and Danke for thank you.' },
    { q: 'What do people do for fun?', a: 'In winter we go to Christmas markets to drink hot chocolate and eat gingerbread.' },
    { q: 'Any tips for a tourist?', a: 'Be on time! In Germany being late is not cool. And on some motorways there is no speed limit, so stay in the right lane!' },
  ],
  spain: [
    { q: 'What do people eat here?', a: 'Paella, tapas, and churros with thick hot chocolate. Sometimes for breakfast!' },
    { q: 'Tell me something funny!', a: "On New Year's Eve we eat twelve grapes, one at each stroke of midnight, for good luck. Try to do it fast!" },
    { q: 'How do I say hello and thank you?', a: '¡Hola! and Gracias. Easy and friendly!' },
    { q: 'What do people do for fun?', a: 'Fiestas! In Buñol people throw tomatoes at each other, and in Valencia they burn giant statues during Las Fallas.' },
    { q: 'Any tips for a tourist?', a: "Don't go to a restaurant for dinner at seven: it will be empty! We have dinner at nine or ten." },
  ],
  italy: [
    { q: 'What do people eat here?', a: 'Pizza, pasta and gelato! But please, never put pineapple on pizza.' },
    { q: 'Tell me something funny!', a: 'For many Italians, cappuccino is only for breakfast. Ordering one after lunch is a little bit strange!' },
    { q: 'How do I say hello and thank you?', a: 'Ciao means both hello and goodbye! And thank you is Grazie.' },
    { q: 'What do people do for fun?', a: 'We talk with our hands! Italians have a gesture for almost everything. And we love football, of course.' },
    { q: 'Any tips for a tourist?', a: 'Throw a coin into the Trevi Fountain in Rome: the legend says you will come back one day!' },
  ],
  greece: [
    { q: 'What do people eat here?', a: 'Souvlaki, feta cheese, olives and Greek salad. Yum!' },
    { q: 'Tell me something funny!', a: 'In Greece, moving your head up can mean no! It can be very confusing for tourists.' },
    { q: 'How do I say hello and thank you?', a: 'Yia sou means hello, and Efcharistó means thank you.' },
    { q: 'What do people do for fun?', a: 'We dance! At some parties people used to break plates while dancing. Today they often throw flowers instead.' },
    { q: 'Any tips for a tourist?', a: 'There are more than two hundred islands with people living on them. Take a ferry and visit a few!' },
  ],
};

// ============================================================================
//  FOOD KIOSKS – one stall on every island. Press E to taste the food and
//  read a fact: every new food goes in the Food passport (🍽 n/8).
// ============================================================================

export const FOODS = {
  france: { food: 'Croissant', icon: '🥐', text: "The croissant is the star of a French breakfast, but its grandfather is the kipferl from Austria! Croissant means 'crescent' in French, because of its moon shape." },
  belgium: { food: 'Waffle', icon: '🧇', text: 'Belgium has two famous waffles: the Brussels waffle, light and rectangular, and the Liège waffle, sweeter, with pearls of sugar inside.' },
  netherlands: { food: 'Stroopwafel', icon: '🍪', text: 'A stroopwafel is two thin waffles with caramel syrup in the middle. It comes from the city of Gouda. Put it on top of your hot drink to make it soft!' },
  uk: { food: 'Fish and chips', icon: '🐟', text: 'Fish and chips is fried fish, usually cod or haddock, with chips. British people have eaten it since the 1860s, often with salt and vinegar.' },
  germany: { food: 'Pretzel', icon: '🥨', text: 'The pretzel (Brezel in German) has a famous knot shape. In Bavaria people eat it with white sausages and sweet mustard.' },
  spain: { food: 'Paella', icon: '🥘', text: 'Paella comes from Valencia, and paella is the name of the pan! The traditional recipe has rice, chicken, rabbit and green beans.' },
  italy: { food: 'Gelato', icon: '🍨', text: 'Italian gelato has less air and less fat than ice cream, so the taste is stronger. Italians eat it all year round, even in winter!' },
  greece: { food: 'Gyros', icon: '🥙', text: "Gyros is meat cooked on a turning spit and served in pita bread with tomato, onion and tzatziki, a sauce of yogurt, cucumber and garlic. Gyros means 'turn' in Greek." },
};

// ============================================================================
//  MISSIONS – somebody on every island lost something (the first person who talks). Talk to them,
//  find the object on the island, then bring it back. ⭐ in the passport!
// ============================================================================

export const MISSIONS = {
  france: { item: 'paintbrush', icon: '🖌️', ask: "Oh là là! I lost my paintbrush and I can't finish my painting of the Eiffel Tower. Can you find it?", thanks: 'Merci beaucoup! Now I can finish my masterpiece!' },
  belgium: { item: 'comic book', icon: '📕', ask: "I was reading my Tintin comic book and now it's gone! Can you look for it?", thanks: 'Thank you! Tintin and his dog Snowy are back with me!' },
  netherlands: { item: 'wooden clog', icon: '👞', ask: 'I lost one of my wooden clogs! Walking with only one shoe is very hard. Can you find it?', thanks: 'Dank je wel! Clogs are perfect for walking on wet fields.' },
  uk: { item: 'umbrella', icon: '☂️', ask: 'Where is my umbrella? In Britain it can rain at any moment! Can you help me find it?', thanks: "Thank you very much! Now I'm ready for the next shower." },
  germany: { item: 'pocket watch', icon: '⌚', ask: 'I lost my watch, and the train leaves at eight o\'clock sharp! Please, can you find it?', thanks: 'Danke schön! Now I will be on time. In Germany we love being punctual!' },
  spain: { item: 'guitar', icon: '🎸', ask: "My guitar is lost! I can't play flamenco without it. Can you find it for me?", thanks: '¡Muchas gracias! Olé! Now the party can start.' },
  italy: { item: 'Vespa key', icon: '🔑', ask: 'Mamma mia! I lost the key of my Vespa. How can I ride around Rome now? Please help me!', thanks: 'Grazie mille! Now I can ride my scooter again. Ciao!' },
  greece: { item: 'amphora', icon: '🏺', ask: 'I lost my amphora, an old Greek vase for olive oil. It belonged to my grandmother! Can you find it?', thanks: 'Efcharistó! You are a real hero, like Hercules!' },
};
