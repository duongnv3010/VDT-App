pipeline {
agent any

environment {
DOCKER\_REGISTRY       = "docker.io"
FRONTEND\_REPO         = "duong3010/fe-image"
BACKEND\_REPO          = "duong3010/be-image"
CONFIG\_REPO           = "https://github.com/duongnv3010/myapp-config.git"
CONFIG\_BRANCH         = "master"
GIT\_CREDENTIALS\_ID    = "github-creds"        // secret text (PAT)
DOCKER\_CREDENTIALS\_ID = "docker-hub-creds"    // username/password
}

stages {
stage('Ensure yq') {
steps {
script {
def yqDir  = "\${env.WORKSPACE}/.tools"
def yqPath = "\${yqDir}/yq"
sh """
mkdir -p \${yqDir}
if \[ ! -f "\${yqPath}" ]; then
echo "Downloading yq to \${yqPath}"
if command -v curl >/dev/null 2>&1; then
curl -sL [https://github.com/mikefarah/yq/releases/latest/download/yq\_linux\_amd64](https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64) -o \${yqPath}
elif command -v wget >/dev/null 2>&1; then
wget -qO \${yqPath} [https://github.com/mikefarah/yq/releases/latest/download/yq\_linux\_amd64](https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64)
else
echo "Error: curl or wget is required to install yq" >&2
exit 1
fi
chmod +x \${yqPath}
else
echo "yq already present at \${yqPath}"
fi
"""
}
}
}

```
stage('Checkout Source') {
  steps {
    checkout scm
  }
}

stage('Determine Changes') {
  steps {
    script {
      // Use Jenkins-provided BRANCH_NAME as tag (or branch) identifier
      env.TAG_NAME = env.BRANCH_NAME
      echo "Release tag/branch = ${env.TAG_NAME}"

      // Detect changes in frontend/ and backend/ since last commit
      env.FRONTEND_CHANGED = sh(
        script: "git diff --name-only HEAD~1 HEAD | grep '^frontend/' || true",
        returnStdout: true
      ).trim()
      env.BACKEND_CHANGED = sh(
        script: "git diff --name-only HEAD~1 HEAD | grep '^backend/'  || true",
        returnStdout: true
      ).trim()

      echo "Frontend changed files:\n${env.FRONTEND_CHANGED}"
      echo "Backend changed files:\n${env.BACKEND_CHANGED}"
    }
  }
}

stage('Build and Push Frontend') {
  when { expression { env.FRONTEND_CHANGED } }
  steps {
    dir('frontend') {
      withCredentials([usernamePassword(
        credentialsId: DOCKER_CREDENTIALS_ID,
        usernameVariable: 'DOCKER_USER',
        passwordVariable: 'DOCKER_PASS'
      )]) {
        sh '''
          docker login -u $DOCKER_USER -p $DOCKER_PASS ${DOCKER_REGISTRY}
          docker build -t ${FRONTEND_REPO}:${TAG_NAME} .
          docker push ${FRONTEND_REPO}:${TAG_NAME}
          docker logout ${DOCKER_REGISTRY}
        '''
      }
    }
  }
}

stage('Build and Push Backend') {
  when { expression { env.BACKEND_CHANGED } }
  steps {
    dir('backend') {
      withCredentials([usernamePassword(
        credentialsId: DOCKER_CREDENTIALS_ID,
        usernameVariable: 'DOCKER_USER',
        passwordVariable: 'DOCKER_PASS'
      )]) {
        sh '''
          docker login -u $DOCKER_USER -p $DOCKER_PASS ${DOCKER_REGISTRY}
          docker build -t ${BACKEND_REPO}:${TAG_NAME} .
          docker push ${BACKEND_REPO}:${TAG_NAME}
          docker logout ${DOCKER_REGISTRY}
        '''
      }
    }
  }
}

stage('Update Helm values.yaml') {
  steps {
    withCredentials([string(
      credentialsId: GIT_CREDENTIALS_ID,
      variable: 'GIT_TOKEN'
    )]) {
      sh '''
        git clone ${CONFIG_REPO} config-repo
        cd config-repo
        git checkout ${CONFIG_BRANCH}

        # Update frontend tag if changed
        if [ -n "${FRONTEND_CHANGED}" ]; then
          ${WORKSPACE}/.tools/yq eval '.frontend.image.tag = strenv(TAG_NAME)' -i values.yaml
        fi
        # Update backend tag if changed
        if [ -n "${BACKEND_CHANGED}" ]; then
          ${WORKSPACE}/.tools/yq eval '.backend.image.tag = strenv(TAG_NAME)' -i values.yaml
        fi

        # Only commit & push if values.yaml changed
        if git diff --quiet; then
          echo "No changes to values.yaml, skipping commit"
        else
          git config user.email "nguyenduong20053010@gmail.com"
          git config user.name  "duongnv3010"
          git add values.yaml
          git commit -m "chore: bump image tags to ${TAG_NAME}"
          git push https://${GIT_TOKEN}@github.com/duongnv3010/myapp-config.git ${CONFIG_BRANCH}
        fi
      '''
    }
  }
}
```

}

post {
success { echo "Pipeline cho tag/branch \${TAG\_NAME} chạy thành công." }
failure { echo "Pipeline thất bại." }
}
}
