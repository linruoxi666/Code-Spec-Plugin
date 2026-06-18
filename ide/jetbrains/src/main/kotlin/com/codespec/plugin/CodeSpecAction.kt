package com.codespec.plugin

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages
import java.io.BufferedReader
import java.io.InputStreamReader

class CodeSpecAction : AnAction("Evaluate Project") {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val basePath = project.basePath ?: return

        val process = ProcessBuilder("csi", "evaluate", basePath)
            .redirectErrorStream(true)
            .start()

        val output = BufferedReader(InputStreamReader(process.inputStream)).use { it.readText() }
        val exitCode = process.waitFor()

        if (exitCode != 0) {
            Messages.showErrorDialog(project, "Code Spec execution failed.\n$output", "Code Spec")
        } else {
            Messages.showInfoMessage(project, "Evaluation completed.\n$output", "Code Spec")
        }
    }

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }
}
