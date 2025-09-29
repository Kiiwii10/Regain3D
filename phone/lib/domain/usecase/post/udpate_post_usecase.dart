import 'package:regain3d_provisioner/core/domain/usecase/use_case.dart';
import 'package:regain3d_provisioner/domain/entity/post/post.dart';
import 'package:regain3d_provisioner/domain/repository/post/post_repository.dart';

class UpdatePostUseCase extends UseCase<int, Post> {
  final PostRepository _postRepository;

  UpdatePostUseCase(this._postRepository);

  @override
  Future<int> call({required params}) {
    return _postRepository.update(params);
  }
}
