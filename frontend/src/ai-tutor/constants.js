// A shortened version of the Index of Learning Styles (ILS) for the FSLSM model
export const QUESTIONS = [
  {
    id: 1,
    text: "I understand something better after I",
    dimension: "ActiveReflective",
    optionA: "try it out.",
    optionB: "think it through.",
    weight: 1 
  },
  {
    id: 2,
    text: "I would rather be considered",
    dimension: "SensingIntuitive",
    optionA: "realistic.",
    optionB: "innovative.",
    weight: 1
  },
  {
    id: 3,
    text: "When I think about what I did yesterday, I am most likely to get",
    dimension: "VisualVerbal",
    optionA: "a picture.",
    optionB: "words.",
    weight: 1
  },
  {
    id: 4,
    text: "I tend to",
    dimension: "SequentialGlobal",
    optionA: "understand details of a subject but may be fuzzy about its overall structure.",
    optionB: "understand the overall structure but may be fuzzy about details.",
    weight: 1
  },
  {
    id: 5,
    text: "When I am learning something new, it helps me to",
    dimension: "ActiveReflective",
    optionA: "talk about it.",
    optionB: "think about it.",
    weight: 1
  },
  {
    id: 6,
    text: "If I were a teacher, I would rather teach a course",
    dimension: "SensingIntuitive",
    optionA: "that deals with facts and real life situations.",
    optionB: "that deals with ideas and theories.",
    weight: 1
  },
  {
    id: 7,
    text: "I prefer to get new information in",
    dimension: "VisualVerbal",
    optionA: "pictures, diagrams, graphs, or maps.",
    optionB: "written directions or verbal information.",
    weight: 1
  },
  {
    id: 8,
    text: "Once I understand",
    dimension: "SequentialGlobal",
    optionA: "all the parts, I understand the whole thing.",
    optionB: "the whole thing, I see how the parts fit.",
    weight: 1
  },
  // Additional questions to make the "Forest" have more data points
  {
    id: 9,
    text: "In a study group working on difficult material, I am more likely to",
    dimension: "ActiveReflective",
    optionA: "jump in and contribute ideas.",
    optionB: "sit back and listen.",
    weight: 1
  },
  {
    id: 10,
    text: "I find it easier",
    dimension: "SensingIntuitive",
    optionA: "to learn facts.",
    optionB: "to learn concepts.",
    weight: 1
  },
  {
    id: 11,
    text: "In a book with lots of pictures and charts, I is likely to",
    dimension: "VisualVerbal",
    optionA: "look at the pictures and charts carefully.",
    optionB: "focus on the written text.",
    weight: 1
  },
  {
    id: 12,
    text: "When solving problems, I more often",
    dimension: "SequentialGlobal",
    optionA: "work step-by-step.",
    optionB: "see the solutions but have to struggle to figure out the steps.",
    weight: 1
  }
];

export const INITIAL_PROFILE = {
  activeReflective: 0,
  sensingIntuitive: 0,
  visualVerbal: 0,
  sequentialGlobal: 0,
};
