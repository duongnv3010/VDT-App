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
        sh '''
          if ! command -v yq &> /dev/null; then
            echo "Installing yq..."
            wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
            chmod +x /usr/local/bin/yq
          else
            echo "yq already installed"
          fi
        '''
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
          // so sánh với commit trước để biết có thay đổi ở frontend/ backend hay không
          env.FRONTEND_CHANGED = sh(
            script: "git diff --name-only HEAD~1 HEAD | grep '^frontend/' || true",
            returnStdout: true
          ).trim()
          env.BACKEND_CHANGED = sh(
            script: "git diff --name-only HEAD~1 HEAD | grep '^backend/'  || true",
            returnStdout: true
          ).trim()
          // TAG_NAME: Jenkins sẽ tự set khi build tag; nếu không có thì fallback
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
          sh '''
            git clone ${CONFIG_REPO} config-repo
            cd config-repo
            git checkout ${CONFIG_BRANCH}

            # Cập nhật giá trị tag nếu có thay đổi
            if [ -n "${FRONTEND_CHANGED}" ]; then
              yq eval '.frontend.image.tag = strenv(TAG_NAME)' -i values.yaml
            fi
            if [ -n "${BACKEND_CHANGED}" ]; then
              yq eval '.backend.image.tag = strenv(TAG_NAME)'  -i values.yaml
            fi

            git config user.email "jenkins@ci.local"
            git config user.name  "jenkins"
            git add values.yaml
            git commit -m "chore: bump image tags to ${TAG_NAME}"
            git push https://${GIT_USER}:${GIT_TOKEN}@github.com/duongnv3010/myapp-config.git ${CONFIG_BRANCH}
          '''
        }
      }
    }
  }

  post {
    success {
      echo "Pipeline cho tag ${TAG_NAME} chạy thành công."
    }
    failure {
      echo "Pipeline thất bại."
    }
  }
}
