export type Limits = {
  sid: string;
  limit: {
    like: number;
    reply: number;
    retweet: number;
  };
}[];

const limits: Limits = [
  {
    sid: "62a83d561c4a210004ad804d",
    limit: {
      like: 2,
      reply: 2,
      retweet: 2,
    },
  },
];

export default limits;
