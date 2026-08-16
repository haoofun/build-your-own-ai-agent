# cart

一个丢给 agent 练手的小项目。测试是规格，`src/` 下的实现要么有 bug、要么还不存在。

跑一遍（`cd` 和测试命令必须在同一条命令里，`bash` 工具每次调用都是新 shell）：

```bash
cd practice/cart && node --test
```

agent 会真的修改这里的文件。跑第二遍之前先复位：

```bash
git checkout -- code/practice/cart && git clean -fd code/practice/cart
```

`git clean` 不能省——agent 会新建文件，`git checkout` 删不掉未跟踪的文件。
