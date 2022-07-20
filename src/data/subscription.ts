export type Limits = {
  sid: string;
  limit: {
    self: {
      like: number;
      reply: number;
      retweet: number;
    };
    others: {
      like: number;
      reply: number;
      retweet: number;
    };
  };
  usernames: number;
}[];

const limits: Limits = [
  // Starter
  {
    sid: "62a83d561c4a210004ad804d",
    limit: {
      self: {
        like: 2,
        reply: 1,
        retweet: 1,
      },
      others: {
        like: 10,
        reply: 5,
        retweet: 8,
      },
    },
    usernames: 1,
  },
  // Intermediate
  {
    sid: "62c2d0522d52a700044eba24",
    limit: {
      self: {
        like: 4,
        reply: 2,
        retweet: 2,
      },
      others: {
        like: 12,
        reply: 5,
        retweet: 10,
      },
    },
    usernames: 1,
  },
  // Pro
  {
    sid: "62c2d064f577150004d2bc66",
    limit: {
      self: {
        like: 6,
        reply: 3,
        retweet: 4,
      },
      others: {
        like: 12,
        reply: 6,
        retweet: 10,
      },
    },
    usernames: 1,
  },
  // Business
  {
    sid: "62c2d08dd283020004adbe66",
    limit: {
      self: {
        like: 4,
        reply: 3,
        retweet: 3,
      },
      others: {
        like: 10,
        reply: 5,
        retweet: 8,
      },
    },
    usernames: 3,
  },
];

export default limits;
