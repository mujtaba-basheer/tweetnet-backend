import { NextFunction, Request, Response } from "express";
import AppError from "../utils/app-error";
import limits from "../data/subscription";
import { config } from "dotenv";
import * as AWS from "aws-sdk";
config();

const credentials = new AWS.Credentials({
  accessKeyId: process.env.DYNAMODB_ACCESS_KEY_ID,
  secretAccessKey: process.env.DYNAMODB_ACCESS_KEY_SECRET,
});
const dynamodb = new AWS.DynamoDB({
  apiVersion: "2012-08-10",
  endpoint: "dynamodb.ap-south-1.amazonaws.com",
  credentials,
  region: "ap-south-1",
});

type User = {
  email: string;
  id: string;
  member_id?: string;
  name: string;
  profile: {
    "twitter-handle": string;
    "twitter-handle-second"?: string;
    "twitter-handle-third"?: string;
    name: string;
  };
  membership: {
    id: string;
    status: string;
    subscribed_to: string;
  };
  username: string[];
  stats: {
    self: {
      like: Stat;
      retweet: Stat;
      reply: Stat;
    };
    others: {
      like: Stat;
      retweet: Stat;
      reply: Stat;
    };
  };
  new_membership?: {
    id: string;
    status: string;
    subscribed_to: string;
  };
  created_at: string;
};

type Stat = {
  count: number;
  last_posted: DateConstructor;
};

export const memberAdded = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.body as User;

    const { id, email, membership, profile, created_at } = user;
    const last_posted = new Date().toISOString();

    const usernames: string[] = [profile["twitter-handle"]];
    const sub_details = limits.find((x) => x.sid === membership.subscribed_to);
    if (sub_details && sub_details.usernames === 3) {
      usernames.push(profile["twitter-handle-second"]);
      usernames.push(profile["twitter-handle-third"]);
    }

    const params: AWS.DynamoDB.PutItemInput = {
      Item: {
        id: { S: id },
        email: { S: email },
        profile: {
          M: {
            usernames: {
              L: usernames.map((u) => ({ S: u.replace("@", "") })),
            },
          },
        },
        membership: {
          M: {
            id: {
              S: membership.id,
            },
            staus: {
              S: membership.status,
            },
            subscribed_to: {
              S: membership.subscribed_to,
            },
          },
        },
        stats: {
          M: {
            self: {
              M: {
                like: {
                  M: {
                    count: { N: "0" },
                    last_posted: { S: last_posted },
                  },
                },
                retweet: {
                  M: {
                    count: { N: "0" },
                    last_posted: { S: last_posted },
                  },
                },
                reply: {
                  M: {
                    count: { N: "0" },
                    last_posted: { S: last_posted },
                  },
                },
              },
            },
            others: {
              M: {
                like: {
                  M: {
                    count: { N: "0" },
                    last_posted: { S: last_posted },
                  },
                },
                retweet: {
                  M: {
                    count: { N: "0" },
                    last_posted: { S: last_posted },
                  },
                },
                reply: {
                  M: {
                    count: { N: "0" },
                    last_posted: { S: last_posted },
                  },
                },
              },
            },
          },
        },
        created_at: { S: created_at },
      },
      TableName: "Users",
    };

    dynamodb.putItem(params, (err, data) => {
      if (err) return next(new AppError(err.message, 503));
      res.json({
        status: true,
        message: "User Added to DB",
      });
    });
  } catch (error) {
    throw new AppError(error.message, 500);
  }
};

export const memberDeleted = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  type UserDeleted = {
    id: string;
    email: string;
  };

  try {
    const data = req.body as UserDeleted;

    const { id } = data;

    const params: AWS.DynamoDB.GetItemInput | AWS.DynamoDB.DeleteItemInput = {
      Key: {
        id: { S: id },
      },
      TableName: "Users",
    };

    dynamodb.getItem(params, (err, data) => {
      if (err) return next(new AppError(err.message, 503));
      dynamodb.deleteItem(params, (err, data) => {
        if (err) return next(new AppError(err.message, 503));
        res.json({
          status: true,
          message: "User Deleted from DB",
        });
      });
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};

export const memberUpdated = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  type UserRecord = {
    membership: {
      M: {
        id: {
          S: string;
        };
        staus: {
          S: string;
        };
        subscribed_to: {
          S: string;
        };
      };
    };
    profile: {
      M: {
        usernames: {
          L: { S: string }[];
        };
      };
    };
  };

  try {
    const user = req.body as User;

    const { id, profile } = user;

    const getUserParams: AWS.DynamoDB.GetItemInput = {
      Key: {
        id: { S: id },
      },
      TableName: "Users",
    };

    dynamodb.getItem(getUserParams, (err, data) => {
      if (err) return next(new AppError(err.message, 503));

      const userRecord: UserRecord = data.Item as UserRecord;
      const { membership } = userRecord;

      const usernames: string[] = [profile["twitter-handle"]];
      const sub_details = limits.find(
        (x) => x.sid === membership.M.subscribed_to.S
      );
      if (sub_details && sub_details.usernames === 3) {
        usernames.push(profile["twitter-handle-second"]);
        usernames.push(profile["twitter-handle-third"]);
      }

      const updateUserParams: AWS.DynamoDB.UpdateItemInput = {
        Key: {
          id: { S: id },
        },
        UpdateExpression: "SET #P = :p",
        ExpressionAttributeNames: {
          "#P": "profile",
        },
        ExpressionAttributeValues: {
          ":p": {
            M: {
              usernames: {
                L: usernames.map((u) => ({ S: u.replace("@", "") })),
              },
            },
          },
        },
        TableName: "Users",
      };

      dynamodb.updateItem(updateUserParams, (err, data) => {
        if (err) {
          console.log(JSON.stringify(err));
          return next(new AppError(err.message, 503));
        }
        res.json({
          status: true,
          message: "User updated",
        });
      });
    });
  } catch (error) {
    throw new AppError(error.message, 500);
  }
};

export const membershipChanged = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  type UserRecord = {
    membership: {
      M: {
        id: {
          S: string;
        };
        staus: {
          S: string;
        };
        subscribed_to: {
          S: string;
        };
      };
    };
    profile: {
      M: {
        usernames: {
          L: { S: string }[];
        };
      };
    };
    stats: {
      M: {
        self: {
          M: {
            like: Stat;
            retweet: Stat;
            reply: Stat;
          };
        };
        others: {
          M: {
            like: Stat;
            retweet: Stat;
            reply: Stat;
          };
        };
      };
    };
  };
  type Stat = {
    count: number;
    last_posted: DateConstructor;
  };

  try {
    const user = req.body as User;

    const { member_id, new_membership } = user;

    const getUserParams: AWS.DynamoDB.GetItemInput = {
      Key: {
        id: { S: member_id },
      },
      TableName: "Users",
    };

    dynamodb.getItem(getUserParams, (err, data) => {
      if (err) return next(new AppError(err.message, 503));

      const userRecord: UserRecord = data.Item as UserRecord;
      const { membership } = userRecord;
      const last_posted = new Date().toISOString();

      const updateUserParams: AWS.DynamoDB.UpdateItemInput = {
        Key: {
          id: { S: member_id },
        },
        UpdateExpression: "SET #M = :m, #S = :s",
        ExpressionAttributeNames: {
          "#M": "membership",
          "#S": "stats",
        },
        ExpressionAttributeValues: {
          ":m": {
            M: {
              id: { S: new_membership.id },
              status: { S: new_membership.status },
              subscribed_to: { S: new_membership.subscribed_to },
            },
          },
          ":s": {
            M: {
              self: {
                M: {
                  like: {
                    M: {
                      count: {
                        N: "0",
                      },
                      last_posted: {
                        S: last_posted,
                      },
                    },
                  },
                  reply: {
                    M: {
                      count: {
                        N: "0",
                      },
                      last_posted: {
                        S: last_posted,
                      },
                    },
                  },
                  retweet: {
                    M: {
                      count: {
                        N: "0",
                      },
                      last_posted: {
                        S: last_posted,
                      },
                    },
                  },
                },
              },
              others: {
                M: {
                  like: {
                    M: {
                      count: {
                        N: "0",
                      },
                      last_posted: {
                        S: last_posted,
                      },
                    },
                  },
                  reply: {
                    M: {
                      count: {
                        N: "0",
                      },
                      last_posted: {
                        S: last_posted,
                      },
                    },
                  },
                  retweet: {
                    M: {
                      count: {
                        N: "0",
                      },
                      last_posted: {
                        S: last_posted,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        TableName: "Users",
      };

      dynamodb.updateItem(updateUserParams, (err, data) => {
        if (err) {
          console.log(JSON.stringify(err));
          return next(new AppError(err.message, 503));
        }
        res.json({
          status: true,
          message: "User membership updated",
        });
      });
    });
  } catch (error) {
    throw new AppError(error.message, 500);
  }
};
