var express = require("express");
var router = express.Router();

const md5 = require("blueimp-md5");
const {
  UserModel,
  ChatModel,
  PostModel,
  PostLikeModel,
  PostCommentModel,
} = require("../db/models");
const filter = { password: 0, __v: 0 }; // 指定过滤的属性

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Express" });
});

// 注册的路由
router.post("/register", function (req, res) {
  // 读取请求参数数据
  const { username, password } = req.body;
  console.log(username, md5(password));
  // 处理: 判断用户是否已经存在, 如果存在, 返回提示错误的信息, 如果不存在, 保存
  // 查询(根据username)
  UserModel.findOne({ username }, function (err, user) {
    // 如果user有值(已存在)
    if (user) {
      // 返回提示错误的信息
      res.send({ code: 1, msg: "This username exits" });
    } else {
      // 没值(不存在)
      // 保存
      new UserModel({ username, password: md5(password) }).save(function (
        error,
        user
      ) {
        // 生成一个cookie(userid: user._id), 并交给浏览器保存
        res.cookie("userid", user._id, {
          maxAge: 1000 * 60 * 60 * 24,
          httpOnly: false,
          sameSite: false,
          ecure: true,
        });
        // 返回包含user的json数据
        const data = { username: user.username, _id: user._id }; // 响应数据中不要携带password
        res.send({ code: 0, data });
      });
    }
  });
  // 返回响应数据
});

// 登陆的路由
router.post("/login", function (req, res) {
  const { username, password } = req.body;
  // 根据username和password查询数据库users, 如果没有, 返回提示错误的信息, 如果有, 返回登陆成功信息(包含user)
  UserModel.findOne({ username, password: md5(password) }, filter, function (
    err,
    user
  ) {
    if (user) {
      // 登陆成功
      // 生成一个cookie(userid: user._id), 并交给浏览器保存
      res.cookie("userid", user._id, {
        maxAge: 1000 * 60 * 60 * 24,
        sameSite: false,
        secure: true,
      });
      // 返回登陆成功信息(包含user)
      res.send({ code: 0, data: user });
    } else {
      // 登陆失败
      res.send({ code: 1, msg: "username or password is not correct!" });
    }
  });
});

// 更新用户信息的路由
router.post("/update", function (req, res) {
  // 从请求的cookie得到userid
  const userid = req.cookies.userid;
  // 如果不存在, 直接返回一个提示信息
  if (!userid) {
    return res.send({ code: 1, msg: "请先登陆" });
  }
  // 存在, 根据userid更新对应的user文档数据
  // 得到提交的用户数据

  const user = req.body; // 没有_id
  console.log(user);
  UserModel.findByIdAndUpdate({ _id: userid }, user, function (error, oldUser) {
    if (!oldUser) {
      // 通知浏览器删除userid cookie
      res.clearCookie("userid");
      // 返回返回一个提示信息
      res.send({ code: 1, msg: "请先登陆" });
    } else {
      // 准备一个返回的user数据对象
      const { _id, username } = oldUser;
      const data = Object.assign({ _id, username }, user);
      // 返回
      res.send({ code: 0, data });
    }
  });
});

// 获取用户信息的路由(根据cookie中的userid)
router.get("/user", function (req, res) {
  // 从请求的cookie得到userid
  const userid = req.cookies.userid;
  console.log(userid);
  // 如果不存在, 直接返回一个提示信息
  if (!userid) {
    return res.send({ code: 1, msg: "请先登陆" });
  }
  // 根据userid查询对应的user
  UserModel.findOne({ _id: userid }, filter, function (error, user) {
    if (user) {
      res.send({ code: 0, data: user });
    } else {
      // 通知浏览器删除userid cookie
      res.clearCookie("userid");
      res.send({ code: 1, msg: "请先登陆" });
    }
  });
});

router.get("/receiver", function (req, res) {
  const { receiverId } = req.query;
  UserModel.findOne({ _id: receiverId }, filter, function (error, receiver) {
    if (receiver) {
      res.send({ code: 0, data: receiver });
    } else {
      res.send({ code: 1, msg: "no receiver found" });
    }
  });
});

// 获取用户列表(根据类型)
router.get("/userlist", function (req, res) {
  const { sex } = req.query;
  UserModel.find({ sex }, filter, function (error, users) {
    res.send({ code: 0, data: users });
  });
});

//---------------------------------------------------------------------------//
router.post("/chat", function (req, res) {
  const { chatId, senderId, time, msg } = req.body;
  const read = false;
  new ChatModel({ chatId, senderId, time, msg, read }).save(function (
    error,
    chat
  ) {
    res.send({ code: 0, data: chat });
  });
});

router.get("/chatlist", function (req, res) {
  const { chatId, resetRead } = req.query;
  if (resetRead === "yes") {
    ChatModel.updateMany(
      { chatId: chatId },
      { read: true },
      (error, data) => {}
    );
  }

  ChatModel.find({ chatId }, function (error, chatlist) {
    res.send({ code: 0, data: chatlist });
  });
});

router.get("/friendlist", function (req, res) {
  const { userid } = req.query;
  ChatModel.find({}, function (error, friendlist) {
    if (friendlist && friendlist.length !== 0) {
      const relatedChatlist = friendlist.filter((a) =>
        a.chatId.includes(userid)
      );
      const finalRelatedChatlist = relatedChatlist.reduce((acc, cv) => {
        let temp = cv.chatId.split("-")[0];
        let friendId = "";
        if (temp !== userid) {
          friendId = temp;
        } else {
          friendId = cv.chatId.split("-")[1];
        }
        if (acc[friendId]) {
          acc[friendId].push(cv);
        } else {
          acc[friendId] = [];
          acc[friendId].push(cv);
        }
        return acc;
      }, {});
      const friendId = Object.keys(finalRelatedChatlist);
      UserModel.find({}, filter, function (error, users) {
        const friendListInfo = users.filter((a) =>
          friendId.includes(a._id.toString())
        );
        const finalResult = { friendListInfo, finalRelatedChatlist };
        res.send({ code: 0, data: finalResult });
      });
    }
  });
});

router.post("/post", function (req, res) {
  const { userId, text, time, image } = req.body;
  new PostModel({ userId, text, time, image }).save(function (error, post) {
    res.send({ code: 0, data: post });
  });
});

router.get("/postlist", async function (req, res) {
  if (req.query.userId) {
    const { userId } = req.query;
    let postlistResult = [];
    PostModel.find({ userId }, async function (error, postlist) {
      const getPostLikeList = async (postId) => {
        return await PostLikeModel.find({ postId }, (error, result) => {});
      };

      const getPostCommentList = async (postId) => {
        return await PostCommentModel.find({ postId }, (error, res) => {});
      };
      postlistResult = postlist;
      await UserModel.find({}, filter, async function (error, users) {
        let result = [];
        for (let j = 0; j < postlistResult.length; j++) {
          const post = postlistResult[j];

          const { userId, text, time, image } = post;
          const postId = post._id;
          const postLikeList = await getPostLikeList(postId);
          const postCommentList = await getPostCommentList(postId);
          for (let i = 0; i < users.length; i++) {
            const {
              _id,
              username,
              age,
              head,
              detail,
              prefer,
              sex,
              background,
            } = users[i];
            if (_id.toString() === userId) {
              result.push({
                postId,
                userId,
                text,
                time,
                image,
                username,
                age,
                head,
                detail,
                prefer,
                sex,
                background,
                postLikeList: postLikeList,
                postCommentList: postCommentList,
              });
            }
          }
        }
        result.sort((a, b) => b.time - a.time);
        res.send({ code: 0, data: result });
      });
    });
  } else {
    const { pagination } = req.query;
    let postlistResult = [];
    const postlist = await PostModel.find({})
      .sort({ time: -1 })
      .limit(5)
      .skip(parseInt(pagination));
    const getPostLikeList = async (postId) => {
      return await PostLikeModel.find({ postId }, (error, result) => {});
    };

    const getPostCommentList = async (postId) => {
      return await PostCommentModel.find({ postId }, (error, res) => {});
    };

    postlistResult = postlist;
    await UserModel.find({}, filter, async function (error, users) {
      let result = [];
      for (let j = 0; j < postlistResult.length; j++) {
        const post = postlistResult[j];

        const { userId, text, time, image } = post;
        const postId = post._id;
        const postLikeList = await getPostLikeList(postId);
        const postCommentList = await getPostCommentList(postId);
        for (let i = 0; i < users.length; i++) {
          const {
            _id,
            username,
            age,
            head,
            detail,
            prefer,
            sex,
            background,
          } = users[i];
          if (_id.toString() === userId) {
            result.push({
              postId,
              userId,
              text,
              time,
              image,
              username,
              age,
              head,
              detail,
              prefer,
              sex,
              background,
              postLikeList: postLikeList,
              postCommentList: postCommentList,
            });
          }
        }
      }
      result.sort((a, b) => b.time - a.time);
      res.send({ code: 0, data: result });
    });
  }
});

router.post("/deletepost", function (req, res) {
  const { _id } = req.body;
  PostLikeModel.deleteMany({ postId: _id }, function (err, result) {});
  PostCommentModel.deleteMany({ postId: _id }, function (err, result) {});
  PostModel({ _id }).deleteOne(function (error, result) {
    res.send({ code: 0, data: result });
  });
});

// router.post("/test", function (req, res) {
//   const postIds = [];
//   PostModel.find({}, async function (error, result) {
//     const getPostLikes = async () => {
//       const result = await PostLikeModel.find({}, (error, result) => {});
//       return result;
//     };
//     const getPostComments = async () => {
//       const result = await PostCommentModel.find({}, (error, result) => {});
//       return result;
//     };
//     const postLikes = await getPostLikes();
//     const postComments = await getPostComments();
//     result.map((v) => {
//       postIds.push(v._id);
//     });
//     postLikes.map(async (i) => {
//       if (!postIds.includes(i.postId)) {
//         await PostLikeModel.deleteMany({ postId: i.postId }, function (
//           err,
//           result
//         ) {});
//       }
//     });
//     postComments.map(async (j) => {
//       if (!postIds.includes(j.postId)) {
//         await PostCommentModel.deleteMany({ postId: j.postId }, function (
//           err,
//           result
//         ) {});
//       }
//     });
//     res.send({ code: 0, msg: "done" });
//   });
// });

router.post("/updatepostlike", function (req, res) {
  const { postId, likeUserId, time, username } = req.body;
  PostLikeModel.findOne({ postId, likeUserId }, function (err, user) {
    if (user) {
      res.send({ code: 1, msg: "This record exist" });
    } else {
      new PostLikeModel({ postId, likeUserId, time, username }).save(function (
        error,
        result
      ) {
        res.send({ code: 0, data: result });
      });
    }
  });
});

router.get("/getpostlike", function (req, res) {
  const { postId } = req.query;
  let array = [];
  PostLikeModel.find({ postId }, async function (err, result) {
    const getUserName = async (userId) => {
      let result = await UserModel.findOne({ _id: userId }, function (
        error,
        user
      ) {});
      return result.username;
    };
    for (let i = 0; i < result.length; i++) {
      let username = await getUserName(result[i].likeUserId);
      const { postId, likeUserId, time } = result[i];
      array.push({ postId, likeUserId, time, username });
    }
    res.send({ code: 0, data: array });
  });
});

router.post("/updatepostcomment", function (req, res) {
  const {
    postId,
    commentUserId,
    head,
    time,
    comment,
    username,
    replyUserId,
    replyUsername,
    authorUnread,
    replyUnread,
  } = req.body;
  new PostCommentModel({
    postId,
    commentUserId,
    head,
    time,
    comment,
    username,
    replyUserId,
    replyUsername,
    authorUnread,
    replyUnread,
  }).save(function (error, result) {
    res.send({ code: 0, data: result });
  });
});

router.get("/getpostcomment", function (req, res) {
  const { postId } = req.query;
  let array = [];
  PostCommentModel.find({ postId }, async function (err, result) {
    const getUserName = async (userId) => {
      let result = await UserModel.findOne({ _id: userId }, function (
        error,
        user
      ) {});
      return { username: result.username, head: result.head };
    };
    for (let i = 0; i < result.length; i++) {
      const { username, head } = await getUserName(result[i].commentUserId);
      const {
        _id,
        postId,
        commentUserId,
        time,
        comment,
        replyUserId,
        replyUsername,
      } = result[i];
      array.push({
        _id,
        postId,
        commentUserId,
        time,
        username,
        head,
        comment,
        replyUserId,
        replyUsername,
        // authorUserId,
      });
    }
    res.send({ code: 0, data: array });
  });
});

router.get("/getcurrentuserfullpost", function (req, res) {
  const { userId } = req.query;
  let array = [];
  PostModel.find({ userId }, async function (err, post) {
    const getPostLikeList = async (postId) => {
      return await PostLikeModel.find({ postId }, (error, result) => {});
    };
    const getComments = async (postId) => {
      const result = await PostCommentModel.find({ postId }, async function (
        err,
        result
      ) {});
      return result;
    };
    for (let i = 0; i < post.length; i++) {
      const each_post = post[i];
      const postCommentList = await getComments(each_post._id);
      const postLikeList = await getPostLikeList(each_post._id);
      const { _id, text, time, image } = each_post;
      const concatResult = {
        _id,
        userId,
        text,
        time,
        image,
        comment: postCommentList,
        postLikeList: postLikeList,
      };
      array.push(concatResult);
    }

    res.send({ code: 0, data: array });
  });
});

router.get("/getreplypost", function (req, res) {
  const { userId } = req.query;
  let array = [];
  PostCommentModel.find({ replyUserId: userId }, async function (
    err,
    comments
  ) {
    const getPostCommentList = async (postId) => {
      const result = await PostCommentModel.find({ postId }, async function (
        err,
        result
      ) {});
      return result;
    };
    const getPostLikeList = async (postId) => {
      return await PostLikeModel.find({ postId }, (error, result) => {});
    };

    const getUserInfo = async (userId) => {
      const result = await UserModel.find({ _id: userId }, function (
        err,
        post
      ) {});
      return result;
    };
    const getPost = async (postId) => {
      const result = await PostModel.find({ _id: postId }, function (
        err,
        post
      ) {});
      return result;
    };
    for (let i = 0; i < comments.length; i++) {
      const element = comments[i];
      const post = await getPost(element.postId);
      const postLikeList = await getPostLikeList(element.postId);
      const postCommentList = await getPostCommentList(element.postId);
      const userInfo = await getUserInfo(post[0].userId);
      const {
        _id,
        postId,
        commentUserId,
        head,
        time,
        comment,
        username,
        replyUserId,
        replyUsername,
        authorUnread,
        replyUnread,
      } = element;
      array.push({
        _id,
        postId,
        commentUserId,
        head,
        time,
        comment,
        username,
        replyUserId,
        replyUsername,
        authorUnread,
        replyUnread,
        post,
        userInfo,
        postLikeList,
        postCommentList,
      });
    }
    res.send({ code: 0, data: array });
  });
});

router.post("/newcommentreadsetting", async (req, res) => {
  const { postId, userId } = req.body;
  await PostCommentModel.updateMany(
    { postId, authorUnread: true },
    { $set: { authorUnread: false } },
    (error, result) => {}
  );
  await PostCommentModel.updateMany(
    { postId, replyUserId: { $in: ["empty", userId] }, replyUnread: true },
    { $set: { replyUnread: false } },
    (error, result) => {}
  );
  res.send({ code: 0, data: "done" });
});

router.post("/newreplyreadsetting", async (req, res) => {
  console.log(req.body);
  const { _ids } = req.body;
  _ids.forEach((v) => {
    PostCommentModel.updateMany(
      { _id: v, replyUnread: true },
      { $set: { replyUnread: false } },
      (error, result) => {}
    );
  });

  res.send({ code: 0, data: "done" });
});

// router.post("/updateCommentHead", async (req, res) => {
//   const getUserHeader = async (commentUserId) => {
//     const result = await UserModel.findOne(
//       { _id: commentUserId },
//       (error, result) => {}
//     );
//     return result.head;
//   };
//   const getComments = async () => {
//     const result = await PostCommentModel.find({}, async function (
//       err,
//       result
//     ) {});
//     return result;
//   };
//   const unmodified_comment = await getComments();
//   for (let j = 0; j < unmodified_comment.length; j++) {
//     const each_comment = unmodified_comment[j];
//     const { _id, commentUserId } = each_comment;
//     const head = await getUserHeader(commentUserId);
//     await PostCommentModel.findByIdAndUpdate(
//       { _id },
//       { $set: { head } },
//       (error, result) => {}
//     );
//   }
//   res.send({ code: 0, data: "done" });
// });

module.exports = router;
