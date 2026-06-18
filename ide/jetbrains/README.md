# Code Spec Plugin for JetBrains IDEs

适用于 IntelliJ IDEA、Android Studio 等 JetBrains IDE 的 Code Spec 插件骨架。

## 功能规划

- 在工具栏增加 **Code Spec > Evaluate Project** 动作
- 调用本地 `csi` CLI 对当前打开项目评分
- 在工具窗口展示评分结果与问题列表
- 支持一键生成并打开 HTML 报告

## 项目结构

```
ide/jetbrains/
├── build.gradle.kts
├── settings.gradle.kts
└── src/
    └── main/
        ├── kotlin/
        │   └── com/codespec/plugin/
        │       ├── CodeSpecAction.kt
        │       └── CodeSpecToolWindowFactory.kt
        └── resources/
            └── META-INF/
                └── plugin.xml
```

## 开发

需要安装 IntelliJ Platform Plugin SDK（Gradle 会自动下载）。

```bash
cd ide/jetbrains
./gradlew runIde
```

## 发布

```bash
./gradlew buildPlugin
```

产物位于 `build/distributions/`。
