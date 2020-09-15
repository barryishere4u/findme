/*
包含n个操作数据库集合数据的Model模块
1. 连接数据库
  1.1. 引入mongoose
  1.2. 连接指定数据库(URL只有数据库是变化的)
  1.3. 获取连接对象
  1.4. 绑定连接完成的监听(用来提示连接成功)
2. 定义出对应特定集合的Model并向外暴露
  2.1. 字义Schema(描述文档结构)
  2.2. 定义Model(与集合对应, 可以操作集合)
  2.3. 向外暴露Model
 */

/*1. 连接数据库*/
// 1.1. 引入mongoose
const mongoose = require("mongoose");
// 1.2. 连接指定数据库(URL只有数据库是变化的)
mongoose.connect("mongodb://www.dreamgoalreality.top:27017/practice", {
  auth: {
    authSource: "admin",
  },
  user: "admin",
  pass: "88711693",
});
// 1.3. 获取连接对象
const conn = mongoose.connection;
// 1.4. 绑定连接完成的监听(用来提示连接成功)
conn.on("connected", () => {
  console.log("db connect success!");
});

/*2. 定义出对应特定集合的Model并向外暴露*/
// 2.1. 字义Schema(描述文档结构)
const userSchema = mongoose.Schema({
  username: { type: String, required: true }, // 用户名
  password: { type: String, required: true }, // 密码
  age: { type: String, required: false },
  head: { type: String, required: false },
  sex: { type: String, required: false },
  prefer: { type: String, required: false },
  detail: { type: String, required: false }, // 个人或职位简介
  background: { type: String, required: false },
});
// 2.2. 定义Model(与集合对应, 可以操作集合)
const UserModel = mongoose.model("user", userSchema); // 集合为: users

const chatSchema = mongoose.Schema({
  chatId: { type: String, required: true },
  senderId: { type: String, required: true },
  time: { type: String, required: true },
  msg: { type: String, required: true },
  read: { type: Boolean, required: true },
});

const ChatModel = mongoose.model("chat", chatSchema);

const postSchema = mongoose.Schema({
  userId: { type: String, required: true },
  time: { type: String, required: true },
  text: { type: String, required: true },
  image: { type: String, require: true },
});

const PostModel = mongoose.model("post", postSchema);

const PostLikeSchema = mongoose.Schema({
  postId: { type: String, required: true },
  likeUserId: { type: String, required: true },
  time: { type: String, required: true },
  username: { type: String, required: true },
});

const PostLikeModel = mongoose.model("post_like", PostLikeSchema);

const PostCommentSchema = mongoose.Schema({
  postId: { type: String, required: true },
  commentUserId: { type: String, required: true },
  head: { type: String, required: true },
  time: { type: String, required: true },
  comment: { type: String, required: true },
  username: { type: String, required: true },
  replyUserId: { type: String, required: true },
  replyUsername: { type: String, required: true },
  replyUnread: { type: Boolean, required: true },
  authorUnread: { type: Boolean, required: true },
});

const PostCommentModel = mongoose.model("post_comment", PostCommentSchema);
// 2.3. 向外暴露Model
exports.UserModel = UserModel;
exports.ChatModel = ChatModel;
exports.PostModel = PostModel;
exports.PostLikeModel = PostLikeModel;
exports.PostCommentModel = PostCommentModel;
