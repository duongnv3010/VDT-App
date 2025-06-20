pipeline {
  agent any

  environment {
    DOCKER_REGISTRY       = "docker.io"
    FRONTEND_REPO         = "duong3010/fe-image"
    BACKEND_REPO          = "duong3010/be-image"
    CONFIG_REPO           = "https://github.com/duongnv3010/myapp-config.git"
    CONFIG_BRANCH         = "master"
    GIT_CREDENTIALS_ID    = "github-creds"
    DOCKER_CREDENTIALS_ID = "docker-hub-creds"
  }

  stages {
    stage('Ensure yq') {
      steps {
        script {
          def yqDir  = "${env.WORKSPACE}/.tools"
          def yqPath = "${yqDir}/yq"
          sh """
            mkdir -p ${yqDir}
            if [ ! -f "${yqPath}" ]; then
              echo "Downloading yq to ${yqPath}"
              if command -v curl >/dev/null 2>&1; then
                curl -sL https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -o ${yqPath}
              elif command -v wget >/dev/null 2>&1; then
                wget -qO ${yqPath} https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
              else
                echo "Error: curl or wget is required to install yq" >&2
                exit 1
              fi
              chmod +x ${yqPath}
            else
              echo "yq already present at ${yqPath}"
            fi
          """
        }
      }
    }

    stage('Checkout Source') {
      steps {
        checkout scm
      }
    }

    stage('Determine Changes') {
      steps {
        script {
          env.FRONTEND_CHANGED = sh(
            script: "git diff --name-only HEAD~1 HEAD | grep '^frontend/' || true",
            returnStdout: true
          ).trim()
          env.BACKEND_CHANGED = sh(
            script: "git diff --name-only HEAD~1 HEAD | grep '^backend/' || true",
            returnStdout: true
          ).trim()
          if (!env.TAG_NAME) {
            env.TAG_NAME = sh(
              script: "git rev-parse --abbrev-ref HEAD",
              returnStdout: true
            ).trim()
          }
          echo "Release tag = ${env.TAG_NAME}"
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
        withCredentials([usernamePassword(
          credentialsId: GIT_CREDENTIALS_ID,
          usernameVariable: 'GIT_USER',
          passwordVariable: 'GIT_TOKEN'
        )]) {
          sh """
            git clone ${CONFIG_REPO} config-repo
            cd config-repo
            git checkout ${CONFIG_BRANCH}

            # Update frontend tag if changed
            if [ -n "${FRONTEND_CHANGED}" ]; then
              ${env.WORKSPACE}/.tools/yq eval '.frontend.image.tag = strenv(TAG_NAME)' -i values.yaml
            fi
            # Update backend tag if changed
            if [ -n "${BACKEND_CHANGED}" ]; then
              ${env.WORKSPACE}/.tools/yq eval '.backend.image.tag = strenv(TAG_NAME)' -i values.yaml
            fi

            git config user.email "jenkins@ci.local"
            git config user.name  "jenkins"
            git add values.yaml
            git commit -m "chore: bump image tags to ${TAG_NAME}"
            git push https://${GIT_USER}:${GIT_TOKEN}@github.com/duongnv3010/myapp-config.git ${CONFIG_BRANCH}
          """
        }
      }
    }
  }

  post {
    success { echo "Pipeline cho tag ${TAG_NAME} chạy thành công." }
    failure { echo "Pipeline thất bại." }
  }
}
