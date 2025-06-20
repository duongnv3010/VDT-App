pipeline {
  agent any

  options {
    // Bỏ checkout mặc định mà Declarative Pipeline tự làm
    skipDefaultCheckout()
    // In timestamp cho mỗi dòng log
    timestamps()
  }

  environment {
    GIT_CRED      = 'github-creds'                   // GitHub credential ID
    DOCKER_CRED   = 'dockerhub-creds'                // Docker Hub credential ID
    DOCKER_NS     = 'duong3010'                      // Docker Hub namespace
    CHART_REPO    = 'https://github.com/duongnv3010/myapp.git'
    CONFIG_REPO   = 'https://github.com/duongnv3010/myapp-config.git'
    CONFIG_BRANCH = 'master'
    // Lấy thẳng tag name từ biến BRANCH_NAME
    TAG           = "${BRANCH_NAME}"
  }

  stages {
    stage('Checkout Code') {
      steps {
        // Checkout đúng commit của tag
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

    stage('Build & Push Images') {
      steps {
        script {
          // Cần cài plugin "Docker Pipeline" để dùng biến docker.{build,push}
          docker.withRegistry('', DOCKER_CRED) {
            // frontend
            docker.build("${DOCKER_NS}/fe-image:${TAG}", "frontend").push()
            // backend
            docker.build("${DOCKER_NS}/be-image:${TAG}", "backend").push()
          }
        }
      }
    }

    stage('Update values.yaml') {
      steps {
        dir('config') {
          // Clone config repo
          git url: CONFIG_REPO, branch: CONFIG_BRANCH, credentialsId: GIT_CRED

          // Cập nhật cả 2 tag trong values.yaml
          sh """
            yq e '.frontend.image.tag = strenv(TAG)' -i values.yaml
            yq e '.backend.image.tag  = strenv(TAG)' -i values.yaml
          """
        }
      }
    }

    stage('Render Manifests & Commit') {
      steps {
        // Clone Helm chart
        dir('chart') {
          git url: CHART_REPO, credentialsId: GIT_CRED
        }

        // Xuất manifest
        sh """
          mkdir -p config/manifests
          helm template vdt-app chart/ \\
            --values config/values.yaml \\
            --output-dir config/manifests
        """

        // Commit & push lại config repo
        dir('config') {
          sh 'git add values.yaml manifests/'
          sh "git commit -m 'CI: bump images to ${TAG} & render manifests'"
          sh "git push origin ${CONFIG_BRANCH}"
        }
      }
    }
  }

  post {
    success {
      echo "✅ Pipeline thành công cho tag=${TAG}"
    }
    failure {
      echo "❌ Pipeline thất bại cho tag=${TAG}"
    }
  }
}
