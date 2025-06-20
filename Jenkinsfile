pipeline {
  agent any
  environment {
    GIT_CRED        = 'github-creds'             // ID credential GitHub (username/password hoặc GitHub App)
    DOCKER_CRED     = 'dockerhub-creds'          // ID credential Docker Hub
    DOCKER_NS       = 'duong3010'                // Namespace trên Docker Hub
    CHART_REPO      = 'https://github.com/duongnv3010/myapp.git'
    CONFIG_REPO     = 'https://github.com/duongnv3010/myapp-config.git'
    CONFIG_BRANCH   = 'master'                     // Nhánh của config repo
  }
  stages {

    stage('Init') {
      steps {
        script {
          // Lấy thẳng tên tag từ BRANCH_NAME
          def TAG = env.BRANCH_NAME
          if (!TAG) {
            error "Không xác định được TAG; BRANCH_NAME=${env.BRANCH_NAME}"
          }
          echo "→ Building for tag: ${TAG}"
        }
      }
    }

    stage('Checkout Code') {
      steps {
        // Checkout mã nguồn đúng tag
        checkout([
          $class: 'GitSCM',
          branches: [[name: "refs/tags/${TAG}"]],
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
          docker.withRegistry('', DOCKER_CRED) {
            // Build & push frontend
            def feImg = docker.build("${DOCKER_NS}/fe-image:${TAG}", "frontend")
            feImg.push()
            // Build & push backend
            def beImg = docker.build("${DOCKER_NS}/be-image:${TAG}", "backend")
            beImg.push()
          }
        }
      }
    }

    stage('Update values.yaml') {
      steps {
        dir('config') {
          // Clone config repo
          git url: CONFIG_REPO, branch: CONFIG_BRANCH, credentialsId: GIT_CRED

          // Cập nhật tag cho frontend & backend
          sh """
            yq e '.frontend.image.tag = strenv(TAG)' -i values.yaml
            yq e '.backend.image.tag  = strenv(TAG)' -i values.yaml
          """
        }
      }
    }

    stage('Render Manifests & Commit') {
      steps {
        script {
          // Clone Helm chart repo
          dir('chart') {
            git url: CHART_REPO, credentialsId: GIT_CRED
          }

          // Xuất manifest tĩnh
          sh """
            mkdir -p config/manifests
            helm template vdt-app chart/ \\
              --values config/values.yaml \\
              --output-dir config/manifests
          """

          // Commit & push trở lại config repo
          dir('config') {
            sh 'git add values.yaml manifests/'
            sh "git commit -m 'CI: bump images to ${TAG} & render manifests'"
            sh "git push origin ${CONFIG_BRANCH}"
          }
        }
      }
    }
  }

  post {
    success {
      echo "✅ Pipeline thành công cho tag=${TAG}"
    }
    failure {
      echo "❌ Pipeline thất bại!"
    }
  }
}
