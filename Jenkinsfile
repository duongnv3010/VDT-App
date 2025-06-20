// Jenkinsfile (Declarative Pipeline)
pipeline {
  /* 1) Chạy trên Kubernetes agent có Docker-in-Docker */
  agent {
    kubernetes {
      yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: docker
    image: docker:20.10.21-git        # đã có Docker CLI & Git
    command:
    - cat
    args:
    - "-"
    tty: true
    volumeMounts:
    - name: docker-sock
      mountPath: /var/run/docker.sock
  volumes:
  - name: docker-sock
    hostPath:
      path: /var/run/docker.sock
"""
    }
  }

  /* 2) Biến môi trường dùng xuyên pipeline */
  environment {
    // Đọc tag từ Multibranch Pipeline (BRANCH_NAME sẽ là tag, ví dụ "v1.0.0")
    TAG                         = "${env.BRANCH_NAME}"
    // Namespace hình ảnh trên Docker Hub
    DOCKER_NS                   = "duong3010"
    // Credentials để login Docker Hub; phải là Username/password
    DOCKERHUB_CREDENTIALS_ID    = "dockerhub-creds"
    // Repo và credential để cập nhật config GitOps (values.yaml)
    GIT_CONFIG_REPO_URL         = "https://github.com/duongnv3010/myapp-config.git"
    GIT_CONFIG_REPO_CREDENTIALS = "github-creds"
    GIT_CONFIG_REPO_BRANCH      = "master"
  }

  options {
    // Xóa workspace sau khi xong, tránh đầy dung lượng
    skipDefaultCheckout()
    timestamps()
  }

  stages {
    stage('1. Checkout Source') {
      steps {
        checkout([
          $class: 'GitSCM',
          branches: [[ name: "refs/tags/${TAG}" ]],
          userRemoteConfigs: [[
            url: 'https://github.com/duongnv3010/VDT-App.git',
            credentialsId: "${GIT_CONFIG_REPO_CREDENTIALS}"
          ]]
        ])
      }
    }

    stage('2. Build & Push Docker Images') {
      steps {
        // Bind Docker Hub creds vào 2 biến DOCKER_USER / DOCKER_PASS
        withCredentials([usernamePassword(
          credentialsId: "${DOCKERHUB_CREDENTIALS_ID}",
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          sh """
            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

            echo "→ Build frontend image..."
            docker build -t ${DOCKER_NS}/fe-image:${TAG} frontend
            docker push ${DOCKER_NS}/fe-image:${TAG}

            echo "→ Build backend image..."
            docker build -t ${DOCKER_NS}/be-image:${TAG} backend
            docker push ${DOCKER_NS}/be-image:${TAG}
          """
        }
      }
    }

    stage('3. Update values.yaml in Config Repo') {
      steps {
        script {
          // Clone config repo
          sh """
            rm -rf config
            git clone --branch ${GIT_CONFIG_REPO_BRANCH} \
              https://${GIT_CONFIG_REPO_CREDENTIALS}@github.com/duongnv3010/myapp-config.git config
          """
        }

        dir('config') {
          // Update image tags
          sh """
            yq e '.frontend.image.tag = strenv(TAG)' -i values.yaml
            yq e '.backend.image.tag  = strenv(TAG)' -i values.yaml
          """

          // Commit & push
          withCredentials([usernamePassword(
            credentialsId: "${GIT_CONFIG_REPO_CREDENTIALS}",
            usernameVariable: 'GIT_USER',
            passwordVariable: 'GIT_PASS'
          )]) {
            sh """
              git config user.name "duongnv3010"
              git config user.email "nguyenduong20053010@gmail.com"
              git add values.yaml
              git commit -m "ci: bump frontend/backend images to ${TAG}"
              git push https://${GIT_USER}:${GIT_PASS}@github.com/duongnv3010/myapp-config.git ${GIT_CONFIG_REPO_BRANCH}
            """
          }
        }
      }
    }
  }

  post {
    success {
      echo "✅ CI pipeline hoàn tất cho tag ${TAG}"
    }
    failure {
      echo "❌ CI pipeline thất bại cho tag ${TAG}"
    }
    always {
      cleanWs()
    }
  }
}
