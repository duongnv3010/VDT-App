// Jenkinsfile (Declarative Pipeline)
pipeline {
  // 1) Chạy trên Docker container có sẵn Docker CLI
  agent {
    docker {
      image 'docker:20.10.21-git'
      args  '-v /var/run/docker.sock:/var/run/docker.sock'
    }
  }

  options {
    skipDefaultCheckout()   // không checkout 2 lần
    timestamps()            // log có kèm timestamp
  }

  environment {
    // Lấy tag trực tiếp từ BRANCH_NAME
    TAG                         = "${env.BRANCH_NAME}"
    DOCKER_NS                   = "duong3010"
    DOCKERHUB_CREDENTIALS_ID    = "dockerhub-creds"
    GIT_CRED                    = "github-creds"
    CHART_REPO                  = "https://github.com/duongnv3010/myapp.git"
    CONFIG_REPO                 = "https://github.com/duongnv3010/myapp-config.git"
    CONFIG_BRANCH               = "master"
  }

  stages {
    stage('1. Checkout Source') {
      steps {
        checkout([
          $class: 'GitSCM',
          branches: [[ name: "refs/tags/${TAG}" ]],
          userRemoteConfigs: [[
            url: 'https://github.com/duongnv3010/VDT-App.git',
            credentialsId: "${GIT_CRED}"
          ]]
        ])
      }
    }

    stage('2. Build & Push Docker Images') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: "${DOCKERHUB_CREDENTIALS_ID}",
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          sh """
            echo "$DOCKER_PASS" \
              | docker login -u "$DOCKER_USER" --password-stdin

            echo "→ Building frontend image..."
            docker build -t ${DOCKER_NS}/fe-image:${TAG} frontend
            docker push ${DOCKER_NS}/fe-image:${TAG}

            echo "→ Building backend image..."
            docker build -t ${DOCKER_NS}/be-image:${TAG} backend
            docker push ${DOCKER_NS}/be-image:${TAG}
          """
        }
      }
    }

    stage('3. Update values.yaml in Config Repo') {
      steps {
        // Clone config repo vào thư mục 'config'
        sh """
          rm -rf config
          git clone --branch ${CONFIG_BRANCH} \
            https://${GIT_CRED}@github.com/duongnv3010/myapp-config.git config
        """
        dir('config') {
          // Cập nhật image tags
          sh """
            yq e '.frontend.image.tag = strenv(TAG)' -i values.yaml
            yq e '.backend.image.tag  = strenv(TAG)' -i values.yaml
          """
          // Commit & push lại
          withCredentials([usernamePassword(
            credentialsId: "${GIT_CRED}",
            usernameVariable: 'GIT_USER',
            passwordVariable: 'GIT_PASS'
          )]) {
            sh """
              git config user.name "jenkins-ci"
              git config user.email "ci@yourdomain.com"
              git add values.yaml
              git commit -m "ci: bump images to ${TAG}"
              git push https://\$GIT_USER:\$GIT_PASS@github.com/duongnv3010/myapp-config.git ${CONFIG_BRANCH}
            """
          }
        }
      }
    }
  }

  post {
    success {
      echo "✅ Pipeline succeeded for tag=${TAG}"
    }
    failure {
      echo "❌ Pipeline failed"
    }
    always {
      cleanWs()   // giờ agent docker chắc chắn có workspace
    }
  }
}
