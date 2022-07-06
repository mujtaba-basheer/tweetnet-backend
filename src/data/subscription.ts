export type Limits = {
  sid: string;
  limit: {
    like: number;
    reply: number;
    retweet: number;
  };
  usernames: number;
}[];

const limits: Limits = [
  // Starter
  {
    sid: "62a83d561c4a210004ad804d",
    limit: {
      like: 2,
      reply: 1,
      retweet: 1,
    },
    usernames: 1,
  },
  // Intermediate
  {
    sid: "62c2d0522d52a700044eba24",
    limit: {
      like: 4,
      reply: 2,
      retweet: 2,
    },
    usernames: 1,
  },
  // Pro
  {
    sid: "62c2d064f577150004d2bc66",
    limit: {
      like: 6,
      reply: 3,
      retweet: 4,
    },
    usernames: 1,
  },
  // Business
  {
    sid: "62c2d08dd283020004adbe66",
    limit: {
      like: 4,
      reply: 3,
      retweet: 3,
    },
    usernames: 3,
  },
];

export default limits;
