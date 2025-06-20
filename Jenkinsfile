pipeline {
    agent {
        kubernetes {
            label 'docker'
            defaultContainer 'docker'
        }
    }

    environment {
        IMAGE_TAG = "${env.TAG_NAME ?: 'manual-build'}"
        BACKEND_IMAGE = "duong3010/be-image:${IMAGE_TAG}"
        FRONTEND_IMAGE = "duong3010/fe-image:${IMAGE_TAG}"
        DOCKERHUB_CREDENTIALS = 'dockerhub-credentials'   // ID credential push Docker Hub
        MANIFEST_REPO = 'https://github.com/duongnv3010/myapp.git'
        GIT_CREDENTIALS = 'github-credentials'            // ID credential để push manifest
    }

    stages {
        stage('Build backend image') {
            steps {
                dir('backend') {
                    script {
                        sh "docker build -t $BACKEND_IMAGE ."
                    }
                }
            }
        }

        stage('Build frontend image') {
            steps {
                dir('frontend') {
                    script {
                        sh "docker build -t $FRONTEND_IMAGE ."
                    }
                }
            }
        }

        stage('Push Docker images') {
            steps {
                withCredentials([usernamePassword(credentialsId: "${DOCKERHUB_CREDENTIALS}", passwordVariable: 'DOCKERHUB_PASS', usernameVariable: 'DOCKERHUB_USER')]) {
                    sh """
                        echo $DOCKERHUB_PASS | docker login -u $DOCKERHUB_USER --password-stdin
                        docker push $BACKEND_IMAGE
                        docker push $FRONTEND_IMAGE
                    """
                }
            }
        }

        stage('Clone manifest repo & update values.yaml') {
            steps {
                // Clone manifest repo về thư mục tạm
                dir('manifest-repo') {
                    git credentialsId: "${GIT_CREDENTIALS}", url: "${MANIFEST_REPO}", branch: 'main'
                    script {
                        // Cài yq nếu cần (dùng /tmp/yq cho an toàn)
                        sh '''
                            if ! command -v yq &> /dev/null; then
                                wget https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -O /tmp/yq
                                chmod +x /tmp/yq
                                YQ_BIN="/tmp/yq"
                            else
                                YQ_BIN="yq"
                            fi
                            $YQ_BIN e '.frontend.image.tag = "${IMAGE_TAG}"' -i values.yaml
                            $YQ_BIN e '.backend.image.tag = "${IMAGE_TAG}"' -i values.yaml

                            git config user.name "duongnv3010"
                            git config user.email "nguyenduong20053010@gmail.com"
                            git add values.yaml
                            git commit -m "Update image tag to ${IMAGE_TAG} [ci skip]" || echo "No changes to commit"
                            git push origin main
                        '''
                    }
                }
            }
        }
    }
}
